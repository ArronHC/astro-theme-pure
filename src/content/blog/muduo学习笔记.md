---
title: muduo学习笔记
description: 学习muduo
tags:
- 笔记
comment: true
publishDate: 2025-12-19 19:31:23
---

为了精进自己的后端开发能力，打算深入陈硕大佬的 muduo 项目，学习网络编程中的Reactor 多线程并发模型，如何处理高并发的情况。

---
# 动起来！
我们在拆解“发动机”之前，不妨先看看这个“发动机”动起来是什么样的：
## 1. 安装依赖
```bash
sudo apt-get update
sudo apt-get install git cmake g++ gcc
# 安装 boost 库
sudo apt-get install libboost-dev libboost-test-dev libboost-program-options-dev libboost-system-dev libboost-filesystem-dev
```
## 2. 下载并编译
陈硕老师提供了编译脚本
```bash
# 克隆仓库
git clone https://github.com/chenshuo/muduo.git
cd muduo

# 运行构建脚本
./build.sh
```
## 3. 看一下效果
我们以老师提供的例子之一 `Echo Server`（回显服务器，你发什么他回什么）来看一下效果：

**建立服务端：**
```bash
./echoserver_unittest
```
**建立客户端：**
```bash
nc 127.0.0.1 2000
```

![](https://blogppics.oss-cn-beijing.aliyuncs.com/blogpics/20251219195127423.png)
可以看到，这是个回显服务器~

---
# 解剖

下一步，我们要了解这背后的原理，其大致由一下核心部分组成，我们用银行来举例子：
1. **EventLoop**：银行的大堂经理，用来唤醒柜台干活，一个银行有且仅有一个大堂经理
2. **Poller**：取号机，客户从这里取号，知道要去哪个柜台处理业务
3. **Channel**：处理具体事务
	这里需要说明的是，Channel 本身不处理事务，比方说客户要来存钱，Channel 只负责按下“存钱”按钮，至于按钮控制的是“存钱”还是发射核弹，Channel 一概不知
4. **TcpConnection**：这是负责把具体操作绑定到“按钮”上的人，Channel 把状态传过来之后，TcpConnection 只负责把“包裹”拿进来放到 `InputBuffer` 中，然后告诉 `User` 有你的包裹！放在 `InputBuffer` 了，接收时间是 xx！TcpConnection 仍然不知道这个包裹装的是什么，只管接收就好了。

此外，我们还需要了解**主线程、子线程群**：
- **主线程**：银行总门口，只进行“**迎宾**”（Accept）操作，把客户领进门后直接分发到子银行
- **子线程群**：负责具体业务的银行，也就是上面我们提到的这些业务

这样，我们就实现了完整的流程。下面，我们看一下每个核心的核心代码：
## Eventloop
这段代码是 muduo 的**绝对核心**，所有的操作都是在这个死循环中进行的，是子线程群的业务逻辑。
```cpp
void EventLoop::loop()
{
  assert(!looping_);
  assertInLoopThread();
  looping_ = true;
  quit_ = false;  // FIXME: what if someone calls quit() before loop() ?
  LOG_TRACE << "EventLoop " << this << " start looping";

  while (!quit_)
  {
    activeChannels_.clear();
    pollReturnTime_ = poller_->poll(kPollTimeMs, &activeChannels_);
    ++iteration_;
    if (Logger::logLevel() <= Logger::TRACE)
    {
      printActiveChannels();
    }
    // TODO sort channel by priority
    eventHandling_ = true;
    for (Channel* channel : activeChannels_)
    {
      currentActiveChannel_ = channel;
      currentActiveChannel_->handleEvent(pollReturnTime_);
    }
    currentActiveChannel_ = NULL;
    eventHandling_ = false;
    doPendingFunctors();
  }

  LOG_TRACE << "EventLoop " << this << " stop looping";
  looping_ = false;
}

```
我们来拆解这段绝对核心：
### 1. 阻塞与等待（The wait）
```cpp
pollReturnTime_ = poller_->poll(kPollTimeMs, &activeChannels_);
```
- Eventloop 问：在最近 `kPollTimeMs` 这段时间，有哪些窗口有事儿要做？
- 假如没有事件，这个线程就会挂起，直到有“客户”再进行处理，而挂起的时候不占用 CPU
- 假如有事件，那么就会把需要进行业务的 Channels 收集到 `activeChannels_` 中，再进行接下来的操作
### 2. 处理网络事件（The Action）
```cpp
for (Channel* channel : activeChannels_)
    {
      currentActiveChannel_ = channel;
      currentActiveChannel_->handleEvent(pollReturnTime_);
    }
```
其实很简单吧！一下就能看懂，遍历每个有事件的窗口，每个窗口“按一下对应的按钮”就可以了

### 3. 处理“任务队列”（The Pending Tasks）

>  pending: 代办的

```cpp
doPendingFunctors();
```
**Eventpoll**在等待客户（休眠状态），但是这个时候另外一个线程想让这个这个线程干点事情，如何调用**Eventpoll**？就用这个函数：
外面的线程把任务塞到一个队列里，然后把**Eventpoll**叫醒，**Eventpoll**醒来之后，处理完网络事件，走到这里，就会把队列里的任务执行一遍

# Channel
Channel 只用考虑这个业务的状态就可以了，而不用管这个业务是什么，这个具体业务由 **TcpConnection** 负责
而这些状态是 Linux 中写死的东西，不会增不会减：
`POLLIN`（可读）、`POLLOUT`（可写）、`POLLHUP`（挂断）、`POLLERR`（错误）
```cpp
void Channel::handleEventWithGuard(Timestamp receiveTime)
{
  eventHandling_ = true;
  LOG_TRACE << reventsToString();
  if ((revents_ & POLLHUP) && !(revents_ & POLLIN))
  {
    if (logHup_)
    {
      LOG_WARN << "fd = " << fd_ << " Channel::handle_event() POLLHUP";
    }
    if (closeCallback_) closeCallback_();
  }

  if (revents_ & POLLNVAL)
  {
    LOG_WARN << "fd = " << fd_ << " Channel::handle_event() POLLNVAL";
  }

  if (revents_ & (POLLERR | POLLNVAL))
  {
    if (errorCallback_) errorCallback_();
  }
  if (revents_ & (POLLIN | POLLPRI | POLLRDHUP))
  {
    if (readCallback_) readCallback_(receiveTime);
  }
  if (revents_ & POLLOUT)
  {
    if (writeCallback_) writeCallback_();
  }
  eventHandling_ = false;
}

```
Channel 要干的事情很无脑，就是个**分类**的活，在接到 **Poller**递过来的events 之后，去按对应的按钮就行了，至于具体的逻辑，我们留给 **TcpConnection**考虑

## TcpConnection

```cpp
TcpConnection::TcpConnection(EventLoop* loop,
                             const string& nameArg,
                             int sockfd,
                             const InetAddress& localAddr,
                             const InetAddress& peerAddr)
  : loop_(CHECK_NOTNULL(loop)),
    name_(nameArg),
    state_(kConnecting),
    reading_(true),
    socket_(new Socket(sockfd)),
    channel_(new Channel(loop, sockfd)),
    localAddr_(localAddr),
    peerAddr_(peerAddr),
    highWaterMark_(64*1024*1024)
{
  channel_->setReadCallback(
      std::bind(&TcpConnection::handleRead, this, _1));
  channel_->setWriteCallback(
      std::bind(&TcpConnection::handleWrite, this));
  channel_->setCloseCallback(
      std::bind(&TcpConnection::handleClose, this));
  channel_->setErrorCallback(
      std::bind(&TcpConnection::handleError, this));
  LOG_DEBUG << "TcpConnection::ctor[" <<  name_ << "] at " << this
            << " fd=" << sockfd;
  socket_->setKeepAlive(true);
}
```

我们拿出其中一条来看看是怎么干活的：
```cpp
channel_->setReadCallback(
      std::bind(&TcpConnection::handleRead, this, _1));
```
- `bind` 函数是用来写“委托书”的
- `handleRead` 委托 `handleRead` 来干活！
- `this` 我们还需要传一下调用者过去，告诉是哪个对象的 `handleRead`
- `_1` 占位符，用来存储时间戳

其实就是告诉这个 **TcpConnection** 对象，假如我们有一个 read 请求发过来了，你就调用 `handleRead` 函数就好

接下来看看 `handleRead` 干了啥：
```cpp
void TcpConnection::handleRead(Timestamp receiveTime)
{
  loop_->assertInLoopThread();
  int savedErrno = 0;
  ssize_t n = inputBuffer_.readFd(channel_->fd(), &savedErrno);
  if (n > 0)
  {
    messageCallback_(shared_from_this(), &inputBuffer_, receiveTime);
  }
  else if (n == 0)
  {
    handleClose();
  }
  else
  {
    errno = savedErrno;
    LOG_SYSERR << "TcpConnection::handleRead";
    handleError();
  }
}
```
首先，`n`：用来看我们这个“包裹”的字节数，当然有 `>0`, `=0`, `<0` 三种状态，对应三种不同的处理，我们来看 `>0` 的情况：
```cpp
if (n > 0)
  {
    messageCallback_(shared_from_this(), &inputBuffer_, receiveTime);
  }
```
- `shared_from_this`：连接数据本身，假如要回传数据就找这个对象
- `inputBuffer_`：存满数据的包裹
- `receiveTime`：包裹到达的时间
至此，大致流程就很清晰了：
- **注册阶段**：我在写某一个服务的，把 `onMessage` 这个函数（也就是 “callback”的对象）塞给了 `TcpConnection`
- **等待阶段**：由 `Eventloop` 等待着客户
- **触发阶段**：客户拿到号，找到对应的窗口（channel），Channel 触发信号，`TcpConnection` 开始 `handleRead`
- **回调阶段**：`TcpConnection` “callback”了我留下的 `onMessage`，其实就是调用了我留给 `TcpConnection` 的代码
可以看得出来，这是一个通用的网络库，我们只要传入不同的 callback，就能实现不同的功能

---
好了，我们基本上搞清楚这个业务逻辑了，最后来看看具体的业务`onMessage` 是怎么处理的，我们还是拿 `EchoServer` 来举例子：
```cpp
void EchoServer::onMessage(const muduo::net::TcpConnectionPtr& conn,
                           muduo::net::Buffer* buf,
                           muduo::Timestamp time)
{
  muduo::string msg(buf->retrieveAllAsString());
  LOG_INFO << conn->name() << " echo " << msg.size() << " bytes, "
           << "data received at " << time.toString();
  conn->send(msg);
}

```
干了两件事：
```cpp
  muduo::string msg(buf->retrieveAllAsString());
```
这里，我们把之前“包裹”里面的数据装到 `msg` 里面

```cpp
conn->send(msg);
```
然后这不是个回显服务器吗，直接把数据发送回 Channel 就可以了，这里，Muduo 会启动 Channel 的 `POLLOUT` 写事件，等 socket 准备好了，EventLoop 会自动帮你发出去，而用户只管把没发送完的数据放到缓存区，就可以离开了。

# 串起来看看！

现在，让我们把时间轴动起来。假设一个客户端发来了 `"Hello"`。
## 第一幕：沉睡与唤醒 (Monitoring)

1. **静默**：`EventLoop` (经理) 正在休息（阻塞在 `Poller::poll`）。
    
2. **到达**：网线上传来电信号，操作系统把 `"Hello"` 放入了内核缓冲区。**Socket (进货口)** 的红灯亮了（Readable）。
    
3. **感知**：`Poller` (监控) 瞬间捕捉到红灯，立马把 `EventLoop` 摇醒：“经理！3号门有动静！”
    

## 第二幕：分发与搬运 (Dispatch & Read)

4. **分发**：`EventLoop` 醒来，找到负责3号门的 `Channel` (安保)，说：“去处理一下。”
    
5. **回调**：`Channel` 看到是“读事件”，立刻按下按钮，调用了 `TcpConnection::handleRead`。
    
6. **搬运**：`TcpConnection` (专员) 跑过来，手里拿着 `Buffer` (篮子)，调用 `inputBuffer_.readFd()`，把 `"Hello"` 从内核搬到了应用的内存里。
    

## 第三幕：决策与执行 (Business Logic)

7. **上报**：货搬完了，`TcpConnection` 拿出你一开始给它的“电话号码” (`onMessage`)，打了过去。
    
8. **处理**：**你 (EchoServer)** 接到电话。
    
    - 你：“收到啥了？”
        
    - 专员：“Hello”。
        
    - 你：“行，给它转成大写，发回去。” (逻辑处理)
        
    - 你调用 `conn->send("HELLO")`。
        

## 第四幕：发送与离场 (Send & Loop)

9. **发送**：`TcpConnection` 尝试直接把 `"HELLO"` 塞回 Socket。
    
    - 如果一次塞完了，结束。
        
    - 如果塞不完，就把剩下的暂存在 `OutputBuffer`，并让 `Channel` 关注“写事件”。
        
10. **回归**：一切处理完毕，`EventLoop` 看看表（更新时间），发现没别的事了，又回到 `Poller` 那里继续打盹，等待下一个信号。


# 从零开始自己造

## 前置知识 ：
### protected/private
前者可以被子类访问，后者只能自己访问
### static
用 `static` 修饰的函数，表示这个类可以直接调用，不用声明对象，比方说
```cpp
Timestamp::now();
```
我们在类中使用 `static const` 来定义常量，比方说
```cpp
static const int kNoneEvent;
```
### const
- 放在函数定义后面，表示这个函数不会修改类中的任何数据
- 放在函数定义前面，修饰这个函数的返回值，表示这个返回值不可修改
### explicit
用于修饰构造函数，**防止编译器进行隐式类型转换**，防止出现不必要的 bug
为了防止这种情况发生：
```cpp
class Socket {
public:
    Socket(int fd) { /* ... */ } // 注意：这里没加 explicit
};

void checkSocket(Socket s) { /* ... */ }

int main() {
    // 编译器会悄悄把 10 转换成 Socket(10)
    // 这在语义上很奇怪：10 只是个数字，怎么就变成对象了？
    checkSocket(10); 
    
    // 甚至允许这种写法：
    Socket s = 20; 
}

```
### 类中的私有变量
比方说 `Socket` 类中的 `sockfd_`，我们习惯性地在私有变量后面加上 `_`
### using
typedef 的现代化写法
我们可以这样来新建一个类型：
```cpp
using ChannelList = std::vector<Channel*>;
```
很好懂，意思是我们建立一个新的类型 `ChannelList`，这个类型实际上是一个 `Channel` 指针的 `vector` 
### 继承
当 B 类是 A 类时，我们使用继承，比方说狗是动物，就可以狗继承动物
```cpp
// 父类（基类）
class Animal {
public:
    void eat() { std::cout << "正在进食..." << std::endl; }
};

// 子类（派生类）继承自 Animal
class Dog : public Animal {
public:
    void bark() { std::cout << "汪汪叫！" << std::endl; }
};

```
有 public 继承、protected 继承、private 继承，主要改变的就是 public 和 protected 的访问权限

🌟我们可以在父类中设置虚函数，利用 `virtual` 关键字，可以在子类中重构父类的虚函数，使用 `final` 关键词可以阻止某个函数被继承
```cpp
class Shape {
public:
    // 虚函数：允许子类重写
    virtual void draw() { std::cout << "画一个图形" << std::endl; }
    // 纯虚函数：该类变为“抽象类”，不能实例化，子类必须实现
    virtual void area() = 0; 
    
    // 核心点：虚析构函数（防止内存泄漏）
    virtual ~Shape() {} 
};

class Circle : public Shape {
public:
    // C++11 建议加上 override 明确表示重写
    void draw() override { std::cout << "画一个圆" << std::endl; }
    void area() override { /* 实现逻辑 */ }
};

```

### static_cast<类型>
用来进行强制类型准换，用法：
```cpp
double pi = 3.14159;
int num = static_cast<int>(pi); // 去掉小数部分，变为 3
```

---
接下来我们按照顺序来构建每个类：
## Noncopyable 类
这个类是一个继承类，许多不可复制的类可以直接继承它
### Noncopyable. h
```cpp
#pragma once

/*

NonCopyable类

所有继承了这个类的类都无法被拷贝

*/

class NonCopyable

{

public:

    //删除拷贝构造函数

    NonCopyable(const NonCopyable&) = delete;

    //删除复制运算符

    NonCopyable& operator=(const NonCopyable&) = delete;

  

protected:

    NonCopyable() = default;

    ~NonCopyable() = default;

};
```

---
## InetAddress 类
这个类的主要作用就是把底层繁琐的网络地址数据**封装**起来，**屏蔽了复杂的字节序转换和结构体操作**

在 Linux 底层，网络地址使用结构体来实现的（比方说 `sockaddr_in` 用于 ipv4），直接操作的话很麻烦，于是用 `InetAddress` 把它封装起来，极大简化了代码量

### InetAddress.h
```cpp
#pragma once

  

#include <arpa/inet.h>

#include <netinet/in.h>

#include <string>

  

class InetAddress

{

public:

    explicit InetAddress(uint16_t port, std::string ip = "127.0.0.1");

  

    explicit InetAddress(const struct sockaddr_in& addr)

        : addr_(addr)

    {}

  

    void setSockAddr(const struct sockaddr_in& addr) { addr_ = addr; }

    std::string toIp() const;

  

    std::string toIpPort() const;

  

    uint16_t toPort() const;

  

    const struct sockaddr_in* getSockAddr() const { return &addr_; }

  

private:

    struct sockaddr_in addr_;

};
```

### InetAddress.cc
```cpp
#include "InetAddress.h"

#include <strings.h>

#include <string.h>

  

InetAddress::InetAddress(uint16_t port, std::string ip)

{

    bzero(&addr_, sizeof addr_);

  

    addr_.sin_family = AF_INET;

  

    addr_.sin_port = htons(port);

  

    inet_pton(AF_INET, ip.c_str(), &addr_.sin_addr.s_addr);

}

  

std::string InetAddress::toIp() const

{

    char buf[64] = {0};

    ::inet_ntop(AF_INET, &addr_.sin_addr, buf, sizeof buf);

    return buf;

}

  

std::string InetAddress::toIpPort() const

{

    char buf[64] = {0};

    ::inet_ntop(AF_INET, &addr_.sin_addr, buf, sizeof buf);

    size_t end = strlen(buf);

    uint16_t port = ntohs(addr_.sin_port);

    sprintf(buf+end, ":%u", port);

    return buf;

}

  

uint16_t InetAddress::toPort() const

{

    return ntohs(addr_.sin_port);

}
```

这里稍微理解一下就行，以后当做底层工具来调用就好了

---
### Timestamp 类
这个类也是用来封装底层复杂逻辑的类，用处就是获取时间戳
### Timestamp.h
```cpp
#pragma once

#include <iostream>

#include <string>

  

class Timestamp

{

public:

    Timestamp();

    explicit Timestamp(int64_t microSecondsSinceEpoch);

    static Timestamp now();

    std::string toString() const;

    int64_t microSecondsSinceEpoch() const { return microSecondsSinceEpoch_;}

  

private:

    int64_t microSecondsSinceEpoch_;

};
```
### Timestamp.cc
```cpp
#include "Timestamp.h"

#include <time.h>

  

Timestamp::Timestamp() : microSecondsSinceEpoch_(0) {}

  

Timestamp::Timestamp(int64_t microSecondsSinceEpoch)

    : microSecondsSinceEpoch_(microSecondsSinceEpoch)

{}

  

Timestamp Timestamp::now()

{

    return Timestamp(time(NULL));

}

  

std::string Timestamp::toString() const

{

    char buf[128] = {0};

    time_t seconds = static_cast<time_t>(microSecondsSinceEpoch_);

    struct tm *tm_time = localtime(&seconds);

    snprintf(buf, sizeof(buf), "%4d/%02d/%02d %02d:%02d:%02d",

             tm_time->tm_year + 1900,

             tm_time->tm_mon + 1,

             tm_time->tm_mday,

             tm_time->tm_hour,

             tm_time->tm_min,

             tm_time->tm_sec);

    return buf;

}
```

同样是直接调用就好了，简化代码用的。

---

## 🌟Socket 类

> [!note] socket 是什么？
> socket（网络连接） 是传输层和应用层之间的桥梁，把复杂的 TCP/IP 协议隐藏在 socket 接口后面。socket 相当于一个**电话机**，用来接发文件的

在 linux 中，“**一切皆文件**”，socket 也不例外，每个 socket 都和一个 fd（文件描述符，其实就是个 ID） 一一对应

socket 的作用就是绑定 IP 地址、接发数据包
### Socket. h
```cpp
#pragma once

  

#include "NonCopyable.h"

  

class InetAddress;

  

class Socket : NonCopyable

{

public:

    explicit Socket(int sockfd)

        : sockfd_(sockfd)

    {}

  

    ~Socket();

  

    int fd() const { return sockfd_; }

  

    void bindAddress(const InetAddress& localaddr);

  

    void listen();

  

    int accept(InetAddress* peeraddr);

  

    void setReuseAddr(bool on);

  

private:

    const int sockfd_;

};
```

### Socket.cc
```cpp
#include "Socket.h"

#include "InetAddress.h"

#include <unistd.h>

#include <sys/types.h>

#include <sys/socket.h>

#include <netinet/tcp.h>

  

Socket::~Socket()

{

    ::close(sockfd_);

}

  

void Socket::bindAddress(const InetAddress& localaddr)

{

    int ret = ::bind(sockfd_,

                    (const struct sockaddr*)localaddr.getSockAddr(),

                    sizeof(struct sockaddr_in));

    if(ret<0)

    {

        perror("bind sockfd error!");

    }

}

  

void Socket::listen()

{

    int ret = ::listen(sockfd_, 1024);

    if(ret<0)

    {

        perror("listen sockfd error!");

    }

}

  

int Socket::accept(InetAddress* peeraddr)

{

    struct sockaddr_in addr;

    socklen_t len = sizeof addr;

  

    int connfd = ::accept(sockfd_, (struct sockaddr*)&addr, &len);

  

    if(connfd >= 0)

    {

        peeraddr->setSockAddr(addr);

    }

  

    return connfd;

}

  

void Socket::setReuseAddr(bool on)

{

    int optval = on ? 1 : 0;

    ::setsockopt(sockfd_, SOL_SOCKET, SO_REUSEADDR, &optval, sizeof optval);

}
```

在这里我们就能看出 RAII（Resource Acquisition Is Initialization，**资源获取即初始化**）原则，**将资源的生命周期与对象作绑定**，对象死了资源自动释放，构造函数中请求资源，析构函数中释放资源（C++在函数结束、抛出异常等情况保证能调用析构函数），防止了内存泄漏，不用再手动管理资源了

这里面讲几个点：
### Ip 地址
在 linux 内核中，用 `strcut sockaddr` 来存储地址，这是个通用接口，长这样：
```cpp
struct sockaddr {
    unsigned short sa_family; // 地址族 (如 AF_INET 代表 IPv4)
    char sa_data[14];         // 包含 IP 和端口的原始数据（难以直接读写）
};

```
另外还有个便于程序员读写的、专为 IPv4 设计的 `strcut sockaddr_in`，长这样：
```cpp
struct sockaddr_in {
    short            sin_family;   // 地址族 (固定为 AF_INET)
    unsigned short   sin_port;     // 16位端口号 (必须是网络字节序 htons)
    struct in_addr   sin_addr;     // 32位 IP 地址结构
    char             sin_zero[8];  // 填充位，为了和 sockaddr 长度保持一致
};

```

那么我们在设置 IP 的时候就这样：在 `sockaddr_in` 中设好参数，在强制类型转换成 `sockaddr` 供程序底层使用，也就有了这个代码：
```cpp
void Socket::bindAddress(const InetAddress& localaddr)

{
//注意这里的类型转换
    int ret = ::bind(sockfd_,

                    (const struct sockaddr*)localaddr.getSockAddr(),

                    sizeof(struct sockaddr_in));

    if(ret<0)

    {

        perror("bind sockfd error!");

    }

}
```

## 🌟Channel 类
每个 socket 都对应一个 Channel，Channel 选择监听哪些信息，但是 **Channel 本身不负责监听**，他只是列个表，然后由 Poller 监听 socket 是否传输了表中的内容。
Poller 监听到之后，再汇报给 EventLoop，EventLoop 拿到 activeChannels 清单，对照着清单一一唤醒Channels
Channel 被唤醒之后，再去叫别的类去进行接下来的操作
我们不直接拿 Channel 去监听 socket，因为这样的话，一万个 scoket 就对应一万个 Channel，每个 Channel 始终监视着 socket，会占用极大的内存
我们用One Loop Per Thread（一个线程一个循环）原则，能让一个线程同时处理成千上万的链接

### Channel.h
```cpp
#pragma once

  

#include "NonCopyable.h"

#include <functional>

#include <memory>

  

class EventLoop;

  

class Channel : NonCopyable

{

public:

    using EventCallback = std::function<void()>;

  

    Channel(EventLoop* loop, int fd);

    ~Channel();

  

    void handleEvent();

  

    void setReadCallback(EventCallback cb) { readCallback_ = std::move(cb); }

    void setWriteCallback(EventCallback cb) { writeCallback_ = std::move(cb); }

    void setErrorCallback(EventCallback cb) { errorCallback_ = std::move(cb); }

    void setCloseCallback(EventCallback cb) { closeCallback_ = std::move(cb); }

  
  

    int index() { return index_; }

    void set_index(int idx) { index_ = idx; }

  

    int fd() const { return fd_; }

    int events() const { return events_; }

  

    void set_revents(int revt) { revents_ = revt; }

  

    bool isNoneEvents() const { return events_ == kNoneEvent; }

  

    void enableReading() { events_ |= kReadEvent; update(); }

    void disableReading() { events &= ~kReadEvent; update(); }

    void enableWriting() { events_ |= kWriteEvent; update(); }

    void disableWriting() { events_ &= ~kWriteEvent; update(); }

    void disableAll() { events_ = kNoneEvent; update(); }

  

    //你开启监听/写入了吗

    bool isWriting() const { return events_ & kWriteEvent; }

    bool isReading() const { return events_ & kReadEvent; }

  

private:

    void update();

  

    static const int kNoneEvent;

    static const int kReadEvent;

    static const int kWriteEvent;

  

    EventLoop* loop_;

    const int fd_;

  

    int events_;

    int revents_;

    int index_;

  

    EventCallback readCallback_;

    EventCallback writeCallback_;

    EventCallback errorCallback_;

    EventCallback closeCallback_;

};
```

### Channel.cc
```cpp
#include "Channel.h"

#include "Eventloop.h"

#include <sts/epoll.h>

#include <iostream>

  

const int Channel::kNoneEvent = 0;

const int Channel::kReadEvent = EPOLLIN | EPOLLPRI;

const int Channel::kWriteEvent = EPOLLOUT;

  

Channel::Channel(EventLoop* loop, int fd)

    : loop_(loop),

      fd_(fd),

      events_(0),

      revents_(0),

      index_(-1),

      tied_(false)

{}

  

Channel::~Channel()

{

  

}

  

void Channel::update()

{

    loop_->updateChannel(this);

  

    std::cout<<"Channel updated: fd="<< fd_ << " events="<<events_<<std::endl;

  

}

  

void Channel::handleEvent

{

    std::cout << "Channel::handleEvent revents: " << revents_ << std::endl;

  

    if((revents_ & EPOLLHUP) && !(revents_ & EPOLLIN))

    {

        if(closeCallback_) closeCallback_();

    }

  

    if(revents_ & EPOLLERR)

    {

        if(errorCallback_) errorCallback_();

    }

  

    if(revents_ & (EPOLLIN | EPOLLPRI))

    {

        if(readCallback_) readCallback_();

    }

  

    if(revents_ & EPOLLOUT)

    {

        if(writeCallback_) writeCallback_();

    }

  

}
```

可以看出，**Channel 的作用就是设置自己需要响应的事件、响应事件**
讲几个点：
### kReadEvent
其中 k 是 const 的缩写，代码中是这么定义的：
```cpp
const int Channel::kNoneEvent = 0;

const int Channel::kReadEvent = EPOLLIN | EPOLLPRI;

const int Channel::kWriteEvent = EPOLLOUT;
```
这其实相当于 01 开关，通过位运算来控制我们监听的事件，这么用：
```cpp
	void enableReading() { events_ |= kReadEvent; update(); }

    void disableReading() { events &= ~kReadEvent; update(); }

    void enableWriting() { events_ |= kWriteEvent; update(); }

    void disableWriting() { events_ &= ~kWriteEvent; update(); }

    void disableAll() { events_ = kNoneEvent; update(); }
```
这样来添加或者删减 Channel 监听的类型
### update ()
其实只需要明确一点就明白了：
Channel 的 events 是自己想要监听的内容，但是需要把这个内容发给 Poller，由他来监听，自然需要 update 一下了

## 🌟Poller 类、EpollPoller 类
Poller 提供接口，EpollPoller 提供底层逻辑
### 用处：
1. 轮询（epoll_wait），直到有活动 channel，抓取到 `activeChannels` 列表，把当前事件传给每个 channel 的 `revents_`；唤醒 EventLoop，EventLoop 去让列表中的 channels 去 `handleEvent()`
2. 维护 epoll 红黑树，其中维护的是 channel 的 fd、指针、愿望清单
### Poller.h
```cpp
#pragma once

  

#include "NonCopyable.h"

#include <vector>

#include <unordered_map>

  

class Channel;

class EventLoop;

  

class Poller : NonCopyable

{

public:

    using ChannelList = std::vector<Channel*>;

  

    Poller(EventLoop* loop);

    virtual ~Poller();

  

    //不停轮询，寻找active的channel

    virtual void poll(int timeoutMs, ChannelList* activeChannel) = 0;

  

    //更新channel的愿望清单

    virtual void updateChannel(Channel* channel) = 0;

  

    //移除channel

    virtual void removeChannel(Channel* channel) = 0;

  

    //有没有这个Channel

    bool hasChannel(Channel* channel) const;

  

    static Poller* newDefaultPoller(EventLoop* loop);

  

protected:

    //维护Poller的监听channel都有哪些

    //channel的fd和channel本身指针作对应

    using ChannelMap = std::unordered_map<int, Channel*>;

    ChannelMap channels_;//由Poller负责

  

private:

    EventLoop* loop_;

};

/*

Poller:

1、维护监听的channel列表

2、轮询，看哪些channel active了

*/
```

### Poller.cc
```cpp
#include "Poller.h"

#include "EpollPoller.h"

#include "Channel.h"

  

Poller::Poller(EventLoop* loop)

    : loop_(loop)

{}

  

Poller::~Poller() = default;

  

bool Poller::hasChannel(Channel* channel) const

{

    auto it = channels_.find(channel->fd());

    return it != channels_.end() && it->second == channel;

}

  

Poller* Poller::newDefaultPoller(EventLoop* loop)

{

    return new EpollPoller(loop);

}
```

### EpollPoller.h
```cpp
#pragma once

  

#include "Poller.h"

#include <vector>

#include <sys/epoll.h>

  

class EpollPoller : public Poller

{

public:

    EpollPoller(EventLoop* loop);

    ~EpollPoller() override;

  

    void poll(int timeoutMs, ChannelList* activeChannels) override;

    void updateChannel(Channel* channel) override;

    void removeChannel(Channel* channel) override;

  

private:

    //填activeChannels

    void fillActiveChannel(int numEvents, ChannelList* activeChannels) const;

    //具体的在epoll中更新channel愿望清单的方式

    void update(int operation, Channel* channel);

  

    int epollfd_;

  

    //即将发生事件的列表

    using EventList = std::vector<struct epoll_event>;

    EventList events_;

  

    //Channel在Poller中的状态

    static const int kNew;//没有在红黑树注册过

    static const int kAdded;//注册了，且在工作

    static const int kDeleted;//注册了，但是没有在工作

};

  

/*

EpollPoller：

使用epoll进行活跃channel的维护

1、维护channel在epoll中的状态

2、找到活跃的channel

*/
```

### EpollPoller.cc
```cpp
#include "EpollPoller.h"

#include "Channel.h"

#include <iostream>

#include <unistd.h>

#include <string.h>

  

const int EpollPoller::kNew = -1;

const int EpollPoller::kAdded = 1;

const int EpollPoller::kDeleted = 2;

  

/*

epoll是socket管理器，用的是红黑树

每一个节点存了一份详细的监听清单，对应一个socket

节点中有：

1、节点信息，包含父子节点指针以及颜色(struct rb_node rbn)

2、socket的fd以及对应的指针(struct epoll_filefd ffd)

3、关注的事件，存用户关注的事件(struct epoll_event event)

4、就绪链表指针，socket活跃时就把这个指针挂载到就绪链表中(struct list_head rdllink)

5、等待队列项，这里面设置了回调函数，用来触发挂载到活跃链表的操作 (wait_queue_t pwq)

6、容器引用，指向节点所属的epoll实例 (struct eventpoll *ep)

*/

  

EpollPoller::EpollPoller(EventLoop* loop)

    : Poller(loop),

      epollfd_(::epoll_create1(EPOLL_CLOEXEC)),

      events_(16)

{

    if(epollfd_ < 0)

    {

        perror("epoll_create1 error");

    }

}

  
  

EpollPoller::~EpollPoller()

{

    ::close(epollfd_);

}

  

//轮询的逻辑

void EpollPoller::poll(int timeoutMs, ChannelList* activeChannels)

{

    //把epoll中的活跃socket填到events_，再返回活跃数量

    //events_是using EventList = std::vector<struct epoll_event>类型的

    int numEvents = ::epoll_wait(epollfd_,

                                 &*events_.begin(),

                                 static_cast<int>(events_.size()),

                                 timeoutMs);

    int saveErrno = errno;

  

    if(numEvents>0)

    {

        fillActiveChannel(numEvents, activeChannels);

  

        //已经把这个events_列表填满了

        if(numEvents == static_cast<int>(events_.size()))

        {

            events_.resize(events_.size()*2);

        }

    }

    else if(numEvents==0)

    {

        std::cout << "nothing happened" << std::endl;

    }

    else

    {

        //假如不是interrupt（自行暂停），那就是真出错了

        if(saveErrno != EINTR)

        {

            perror("EpollPoller::poll Error!");

        }

    }

}

  

//填充activeChannels，这些channels活跃了，要处理事件了

void EpollPoller::fillActiveChannel(int numEvents, ChannelList* activeChannels) const

{

    for(int i=0;i<numEvents;i++)

    {

        Channel* channel = static_cast<Channel*>(events_[i].data.ptr);

  

        channel->set_revents(events_[i].events);

  

        activeChannels->push_back(channel);

    }

}

  

//把channel的清单更新同步到内核中（channel活跃了）

void EpollPoller::updateChannel(Channel* channel)

{

    //看看状态是啥，怎么更新

    const int index = channel->index();

  

    if(index==kNew||index==kDeleted)//epoll里没有这个channel，加进来

    {

        if(index==kNew)

        {

            int fd = channel->fd();

            channels_[fd] = channel;

        }

  

        channel->set_index(kAdded);

        update(EPOLL_CTL_ADD, channel);

    }

    else//kAdded，有了，更新一下清单

    {

        if(channel->isNoneEvents())

        {

            update(EPOLL_CTL_DEL,channel);

            channel->set_index(kDeleted);

        }

        else

        {

            update(EPOLL_CTL_MOD, channel);

        }

    }

}

  

void EpollPoller::removeChannel(Channel* channel)

{

    int fd = channel->fd();

    channels_.erase(fd);

  

    int index = channel->index();

    if(index == kAdded)

    {

        update(EPOLL_CTL_DEL, channel);

    }

    //Channel被移除了，直接注销了

    channel->set_index(kNew);

}

  

//具体怎么更新？

void EpollPoller::update(int operation, Channel* channel)

{

    //组装事件包

    struct epoll_event event;

    bzero(&event, sizeof event);

  

    event.events = channel->events();

    event.data.ptr = channel;

  

    int fd = channel->fd();

    //把愿望清单发给内核

    if (::epoll_ctl(epollfd_, operation, fd, &event) < 0)

    {

        perror("epoll_ctl error");

    }

  

}
```

## 🌟EventLoop 类
这个类主要起到命令别的类的作用，操控者程序的主循环。被 Poller 唤醒，再让 Channel 处理事件；Channel 让 EventLoop 更新 Channel 自己的愿望清单，EventLoop 让 Poller 更新愿望清单
### EventLoop.h
```cpp
#pragma once

  

#include <vector>

#include <atomic>

#include <memory>

  

#include "NonCopyable.h"

#include "Timestamp.h"

#include "CurrentThread.h"

  

class Channel;

class Poller;

  

class EventLoop : NonCopyable

{

public:

    using ChannelList = std::vector<Channel*>;

  

    EventLoop();

    ~EventLoop();

  

    void loop();

  

    void quit();

  

    void updateChannel(Channel* channel);

    void removeChannel(Channel* channel);

    bool hasChannel(Channel* channel);

  

    bool isInLoopThread() const;

  

private:

    void abortNotInLoopthread();

  

    std::atomic_bool looping_;

    std::atomic_bool quit_;

  

    const pid_t threadId_;

  

    std::unique_ptr<Poller> poller_;

    ChannelList activeChannels_;

};
```
### EventLoop.cc
```cpp
#include "EventLoop.h"

#include "Poller.h"

#include "Channel.h"

#include "CurrentThread.h"

#include <iostream>

  

__thread EventLoop* t_loopInThisThread = nullptr;

  

const int kPollTimeMs = 100000;

EventLoop::EventLoop()

    : looping_(false),

     quit_(false),

     threadId_(CurrentThread::tid()),

     poller_(Poller::newDefaultPoller(this))

{

    std::cout << "EventLoop created " << this << " in thread " << threadId_ << std::endl;

  

    if(t_loopInThisThread)

    {

        std::cerr << "Another EventLoop " << t_loopInThisThread

                  << " exists in this thread " << threadId_ << std::endl;

        exit(1); // 严禁一个线程搞两个 Loop

    }

    else

    {

        t_loopInThisThread = this;

    }

}

  

EventLoop::~EventLoop()

{

    looping_ = false;

    t_loopInThisThread = nullptr;

}

  

void EventLoop::loop()

{

    looping_ = true;

    quit_ = false;

  

    std::cout << "EventLoop " << this << " start looping" << std::endl;

  

    while(!quit_)

    {

        activeChannels_.clear();

  

        poller_->poll(kPollTimeMs,&activeChannels_);

  

        for(Channel* channel : activeChannels_)

        {

            channel->handleEvent();

        }

    }

  

    std::cout << "EventLoop " << this << " stop looping" << std::endl;

    looping_=false;

}

  

void EventLoop::quit()

{

    quit_=true;

}

  

void EventLoop::updateChannel(Channel* channel)

{

    if(isInLoopThread())

    {

        poller_->updateChannel(channel);

    }

    else

    {

        std::cerr << "EventLoop::updateChannel called from different thread!" << std::endl;

    }

}

  

void EventLoop::removeChannel(Channel* channel)

{

    if(isInLoopThread())

    {

        poller_->removeChannel(channel);

    }

}

  

bool EventLoop::hasChannel(Channel* channel)

{

    return poller_->hasChannel(channel);

}

  

bool EventLoop::isInLoopThread() const

{

    return threadId_ == CurrentThread::tid();

}
```

## 整体流程图：

![6c9ad7879c4aad951aaa6a2a7541f2c0.jpg](https://blogppics.oss-cn-beijing.aliyuncs.com/blogpics/20251224222903743.png)

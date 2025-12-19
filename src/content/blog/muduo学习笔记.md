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
## 动起来！
我们在拆解“发动机”之前，不妨先看看这个“发动机”动起来是什么样的：
### 1. 安装依赖
```bash
sudo apt-get update
sudo apt-get install git cmake g++ gcc
# 安装 boost 库
sudo apt-get install libboost-dev libboost-test-dev libboost-program-options-dev libboost-system-dev libboost-filesystem-dev
```
### 2. 下载并编译
陈硕老师提供了编译脚本
```bash
# 克隆仓库
git clone https://github.com/chenshuo/muduo.git
cd muduo

# 运行构建脚本
./build.sh
```
### 3. 看一下效果
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
## 解剖

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
### Eventloop
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
#### 1. 阻塞与等待（The wait）
```cpp
pollReturnTime_ = poller_->poll(kPollTimeMs, &activeChannels_);
```
- Eventloop 问：在最近 `kPollTimeMs` 这段时间，有哪些窗口有事儿要做？
- 假如没有事件，这个线程就会挂起，直到有“客户”再进行处理，而挂起的时候不占用 CPU
- 假如有事件，那么就会把需要进行业务的 Channels 收集到 `activeChannels_` 中，再进行接下来的操作
#### 2. 处理网络事件（The Action）
```cpp
for (Channel* channel : activeChannels_)
    {
      currentActiveChannel_ = channel;
      currentActiveChannel_->handleEvent(pollReturnTime_);
    }
```
其实很简单吧！一下就能看懂，遍历每个有事件的窗口，每个窗口“按一下对应的按钮”就可以了

#### 3. 处理“任务队列”（The Pending Tasks）

>  pending: 代办的

```cpp
doPendingFunctors();
```
**Eventpoll**在等待客户（休眠状态），但是这个时候另外一个线程想让这个这个线程干点事情，如何调用**Eventpoll**？就用这个函数：
外面的线程把任务塞到一个队列里，然后把**Eventpoll**叫醒，**Eventpoll**醒来之后，处理完网络事件，走到这里，就会把队列里的任务执行一遍

## Channel
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

### TcpConnection

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

## 串起来看看！

现在，让我们把时间轴动起来。假设一个客户端发来了 `"Hello"`。
#### 第一幕：沉睡与唤醒 (Monitoring)

1. **静默**：`EventLoop` (经理) 正在休息（阻塞在 `Poller::poll`）。
    
2. **到达**：网线上传来电信号，操作系统把 `"Hello"` 放入了内核缓冲区。**Socket (进货口)** 的红灯亮了（Readable）。
    
3. **感知**：`Poller` (监控) 瞬间捕捉到红灯，立马把 `EventLoop` 摇醒：“经理！3号门有动静！”
    

#### 第二幕：分发与搬运 (Dispatch & Read)

4. **分发**：`EventLoop` 醒来，找到负责3号门的 `Channel` (安保)，说：“去处理一下。”
    
5. **回调**：`Channel` 看到是“读事件”，立刻按下按钮，调用了 `TcpConnection::handleRead`。
    
6. **搬运**：`TcpConnection` (专员) 跑过来，手里拿着 `Buffer` (篮子)，调用 `inputBuffer_.readFd()`，把 `"Hello"` 从内核搬到了应用的内存里。
    

#### 第三幕：决策与执行 (Business Logic)

7. **上报**：货搬完了，`TcpConnection` 拿出你一开始给它的“电话号码” (`onMessage`)，打了过去。
    
8. **处理**：**你 (EchoServer)** 接到电话。
    
    - 你：“收到啥了？”
        
    - 专员：“Hello”。
        
    - 你：“行，给它转成大写，发回去。” (逻辑处理)
        
    - 你调用 `conn->send("HELLO")`。
        

#### 第四幕：发送与离场 (Send & Loop)

9. **发送**：`TcpConnection` 尝试直接把 `"HELLO"` 塞回 Socket。
    
    - 如果一次塞完了，结束。
        
    - 如果塞不完，就把剩下的暂存在 `OutputBuffer`，并让 `Channel` 关注“写事件”。
        
10. **回归**：一切处理完毕，`EventLoop` 看看表（更新时间），发现没别的事了，又回到 `Poller` 那里继续打盹，等待下一个信号。

也就是说，**socket**用来处理文件的进出，**Poller**用来监测有无文件进出，然后唤醒 **EventLoop**，**EventLoop**唤醒 **Channel**，**Channel**根据文件类型，发信号给 **TcpConnection**，**TcpConnection**把文件接收过来，按照“callback”去给 **User** “打电话”，**User**接到电话，处理这批货，再发给**TcpConnection**，**TcpConnection**尝试直接把货塞给 **socket**，能塞完就结束了，塞不完就把货放在 **OutputBuffer**，让 **Channel** 关注“写事件”，**Channel**转头告诉**EventLoop**，**EventLoop**记下来，就继续到 **Poller**等待了，直到这个 socket 的发送缓冲区空出来，系统内核叫醒 **EventLoop**，**EventLoop**再让 **Channel** 调用 `TcpConnection::handleWrite()` 继续传

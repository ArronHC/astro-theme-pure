---
title: 入门Node.js
description: Node.js是什么，怎么用？
tags:
- 笔记
publishDate: 2025-09-22 17:49:51
heroImage: { src: 'https://tse1.mm.bing.net/th/id/OIP.aqk7aOsCh5urrV00hAbbEQHaEc?rs=1&pid=ImgDetMain&o=7&rm=3', inferSize: true }
comment: true
---
## Node. js 是什么
---
**Node.js** 是一个基于Chrome V8 JavaScript引擎的JavaScript运行时环境，让JavaScript可以在服务器端运行。

假如没有 Node. js，JavaScript 只能在浏览器上运行，而 Node. js 可以让 JavaScript 像 Python、Java 一样，能够直接在电脑上运行

## 如何使用 Node. js
---
### npm 介绍
我们一般使用 npm（Node Package manager）进行 Node. js 的包管理，实现以下功能：
- 安装和管理 JS 包、模块
- 管理项目依赖
- 发布自己的包到 npm 仓库
- 运行脚本命令
npm 随 Node. js 一同安装
### npm 常用命令
---
#### 0. 检查版本
```bash
node --version
npm --version
```
#### 1. 初始化项目
```bash
# 创建package.json文件
npm init
# 快速创建package.json文件
npm init -y 
```
#### 2. 安装包
```bash
# 安装到生产依赖
npm install <包名>
npm i <包名>  # 简写

# 安装到开发依赖
npm install <包名> --save-dev
npm i <包名> -D  # 简写

# 全局安装
npm install <包名> -g

# 安装指定版本
npm install <包名>@版本号

```
#### 3. 卸载包
```bash
# 卸载本地包
npm uninstall <包名>

# 卸载全局包
npm uninstall <包名> -g

```
#### 4. 查看包信息
```bash
# 查看已安装的包
npm list
npm ls

# 查看全局包
npm list -g

# 查看包信息
npm info <包名>
```
#### 5. 更新包
```bash
# 更新所有包
npm update

# 更新指定包
npm update <包名>

```
### package. json 结构
---
这是项目的配置文件, 结构如下:
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "项目描述",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest",
    "build": "webpack"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "jest": "^28.0.0"
  }
}

```
#### 依赖类型
- **dependencies**: 生产环境需要的包
- **devDependencies**: 开发环境需要的包（如测试工具、构建工具）
- **peerDependencies**: 同伴依赖
- **optionalDependencies**: 可选依赖
#### 版本号规则
```bash
"^1.2.3"  # 兼容版本：>=1.2.3 <2.0.0
"~1.2.3"  # 近似版本：>=1.2.3 <1.3.0
"1.2.3"   # 精确版本
"*"       # 最新版本
```
#### 常用 npm 脚本
在 package. json 中定义脚本:
```json
{
"scripts": {
    "start": "node index.js",
    "test": "jest",
    "build": "webpack"
  }
}
```
运行脚本:
```bash
npm run start
npm run test
npm test # npm run test的缩写
```
### 使用 Node. js 创建项目的基本流程
#### 1.创建项目目录
```bash
mkdir my-project
cd my-project
```
#### 2.初始化项目
```bash
npm init -y
```
#### 3. 安装一些包
```
npm install ...
```
#### 4. 创建入口文件
```bash
echo "console.log('Hello npm!')" > index.js
```

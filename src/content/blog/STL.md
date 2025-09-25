---
title: C++中常用的STL
description: C++中常用的 STL
tags:
- 笔记
- 汇总
publishDate: 2025-09-25 10:35:27
comment: true
---
## string
---
字符串，有一些很好用的内置函数，下面介绍一些好用但之前不了解的：
### 一、构造函数
```cpp
string s(num ,c)//生成num个c字符的字符串

例如：

string s(5,'3') => "33333"
```
### 二、比较函数
string 可以直接使用比较符进行大小比较，string 所谓的“大小”是这样来判断的：
从左到右一位一位比较，按照字典序进行大小比较
同时，string ("aaaa") < string ("aaaaa")
### 三、插入
1. `pushback` 在末尾插入一个字符
```cpp
s.push_back('c');
```
2. `insert` 在位置 pos 前插入字符 
```cpp
s.insert(3,'+');
```
### 四、子串
```cpp
//返回从第三位往后的子串
s.substr(3);
//返回2~5位的子串
s.substr(2,5);
```
### 五、`to_string` 和 `stoi`
`to_string` 可以将十进制类型 int、long、longlong、double 等转化为 string 类型
```cpp
s = to_string(1234); => "1234"
```
`stoi` 可以将 string 类型转换为十进制
```cpp
int x = stoi("1234",0,3); => 1234
```
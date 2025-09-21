---
title: LaTeX的学习笔记
description: LaTeX，最好用的数学排版工具
tags: 
- 笔记
- Markdown
publishDate: 2025-09-02 18:11:51
heroImage: { src: 'https://picx.zhimg.com/v2-2e9b7ef09c2c67fbd3c9a30b9a764a79_r.webp?source=172ae18b&consumer=ZHI_MENG', inferSize: true }
comment: true
---

## 介绍
LaTex（读作 "Lay-tek"）是一个排版工具，相比 Word 中用鼠标调整格式，LaTeX 全部采用代码来描述文档的结构和内容，再将其编译为 pdf 文档。
## 数学公式的输入方式
使用 `$..$` 来框住数学表达式
### 1. 行内公式
行内公式使用 `$..$` 包裹，数学表达式嵌入在语句中，不会打断语句
**例如**：
当变量 $x$ 趋近于无穷时，表达式 $\dfrac{1}{x}$ 的极限为 0.
**其源码为**：
```Markdown
当变量 $x$ 趋近于无穷时，表达式 $\dfrac{1}{x}$ 的极限为 0.
```
### 2. 行间公式
行间公式使用 `$$..$$` 包裹，数学表达式独占一行，并会居中显示，公式内部的元素也会完整展开显示。
**例如**：
计算下面这个极限：
$$
\lim_{x\to\infty}\dfrac{1}{x}=0
$$
**其源码为**：
```Markdown
计算下面这个极限：
$$
\lim_{x\to\infty}\dfrac{1}{x}=0
$$
```
### 3. 上下标
上标用 `^` 实现，比方 $e^x$，下标用 `_` 实现，比方 $a_1$。假如上下标很长，要用 `{}` 框起来，比如 $e^{x+1}$

> $x^{10}$ 要写作 `$x^{10}$` 而不是 `$x^10$`, $x^10$

### 4. 字符
**希腊字母**：
- 小写： `\alpha`，`\beta`, `\gamma`, `\delta`....
- 大写：`\Alpha`，`\Beta`, `\Gamma`, `\Delta`....（首字母大写即可）
**例如**：
$$
\alpha^2+\beta^2=\gamma
$$
**其他字符**：

| 功能           | 示例代码                                                                                          | 显示效果                                                                      | 备注                 |
| :----------- | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ | :----------------- |
| **积分、求和、极限** | `\int_a^b f(x)dx` <br> `\sum_{i=1}^n a_i` <br> `\lim_{x \to \infty} f(x)`                     | $\int_a^b f(x)dx$ <br> $\sum_{i=1}^n a_i$ <br> $\lim_{x \to \infty} f(x)$ | 在行内模式会压缩           |
| **关系运算符**    | `\leq`, `\geq`, `\neq`, `\approx`, `\equiv`                                                   | $\leq, \geq, \neq, \approx, \equiv$                                       | 小于等于、大于等于、不等、约等、恒等 |
| **集合运算符**    | `\in`, `\notin`, `\subset`, `\cup`, `\cap`                                                    | $\in, \notin, \subset, \cup, \cap$                                        | 属于、不属于、子集、并集、交集    |
| **箭头**       | `\to`, `\rightarrow`, `\Rightarrow`, `\leftrightarrow`                                        | $\to, \rightarrow, \Rightarrow, \leftrightarrow$                          |                    |
| **其他常用符号**   | `\infty` (无穷) <br> `\nabla` (梯度) <br> `\partial` (偏导) <br> `\forall` (任意) <br> `\exists` (存在) | $\infty$ <br> $\nabla$ <br> $\partial$ <br> $\forall$ <br> $\exists$      |                    |
| **向量**       | `\vec{a}` <br> `\overrightarrow{AB}`                                                          | $\vec{a}$ <br> $\overrightarrow{AB}$                                      |                    |
| **上下括号**     | `\underbrace{a+b+\cdots+z}_{26}` <br> `\overbrace{a+b+\cdots+z}^{26}`                         | $\underbrace{a+b+\cdots+z}_{26}$ <br> $\overbrace{a+b+\cdots+z}^{26}$     |                    |
|              |                                                                                               |                                                                           |                    |

希腊字母对照表：

| 希腊字母 (大写)  | LaTeX 命令   | 希腊字母 (小写)  | LaTeX 命令   | 备注                                              |
| :--------- | :--------- | :--------- | :--------- | :---------------------------------------------- |
| $\Alpha$   | `\Alpha`   | $\alpha$   | `\alpha`   | `\Alpha` 需要 `upgreek` 或 `amsmath` (但通常用英文字母A)   |
| $\Beta$    | `\Beta`    | $\beta$    | `\beta`    | `\Beta` 需要 `upgreek` 或 `amsmath` (但通常用英文字母B)    |
| $\Gamma$   | `\Gamma`   | $\gamma$   | `\gamma`   |                                                 |
| $\Delta$   | `\Delta`   | $\delta$   | `\delta`   |                                                 |
| $\Epsilon$ | `\Epsilon` | $\epsilon$ | `\epsilon` | 另一种写法：$\varepsilon$ (`\varepsilon`)             |
| $\Zeta$    | `\Zeta`    | $\zeta$    | `\zeta`    | `\Zeta` 需要 `upgreek` 或 `amsmath` (但通常用英文字母Z)    |
| $\Eta$     | `\Eta`     | $\eta$     | `\eta`     | `\Eta` 需要 `upgreek` 或 `amsmath` (但通常用英文字母H)     |
| $\Theta$   | `\Theta`   | $\theta$   | `\theta`   | 另一种写法：$\vartheta$ (`\vartheta`)                 |
| $\Iota$    | `\Iota`    | $\iota$    | `\iota`    | `\Iota` 需要 `upgreek` 或 `amsmath` (但通常用英文字母I)    |
| $\Kappa$   | `\Kappa`   | $\kappa$   | `\kappa`   | `\Kappa` 需要 `upgreek` 或 `amsmath` (但通常用英文字母K)   |
| $\Lambda$  | `\Lambda`  | $\lambda$  | `\lambda`  |                                                 |
| $\Mu$      | `\Mu`      | $\mu$      | `\mu`      | `\Mu` 需要 `upgreek` 或 `amsmath` (但通常用英文字母M)      |
| $\Nu$      | `\Nu`      | $\nu$      | `\nu`      | `\Nu` 需要 `upgreek` 或 `amsmath` (但通常用英文字母N)      |
| $\Xi$      | `\Xi`      | $\xi$      | `\xi`      |                                                 |
| $\Omicron$ | `\Omicron` | $\omicron$ | `\omicron` | `\Omicron` 需要 `upgreek` 或 `amsmath` (但通常用英文字母O) |
| $\Pi$      | `\Pi`      | $\pi$      | `\pi`      | 另一种写法：$\varpi$ (`\varpi`)                       |
| $\Rho$     | `\Rho`     | $\rho$     | `\rho`     | 另一种写法：$\varrho$ (`\varrho`)                     |
| $\Sigma$   | `\Sigma`   | $\sigma$   | `\sigma`   | 另一种写法：$\varsigma$ (`\varsigma`)                 |
| $\Tau$     | `\Tau`     | $\tau$     | `\tau`     | `\Tau` 需要 `upgreek` 或 `amsmath` (但通常用英文字母T)     |
| $\Upsilon$ | `\Upsilon` | $\upsilon$ | `\upsilon` |                                                 |
| $\Phi$     | `\Phi`     | $\phi$     | `\phi`     | 另一种写法：$\varphi$ (`\varphi`)                     |
| $\Chi$     | `\Chi`     | $\chi$     | `\chi`     | `\Chi` 需要 `upgreek` 或 `amsmath` (但通常用英文字母X)     |
| $\Psi$     | `\Psi`     | $\psi$     | `\psi`     |                                                 |
| $\Omega$   | `\Omega`   | $\omega$   | `\omega`   |                                                 |


### 5. 分数
**命令**：`\frac{分母}{分子}`
**例如**：
$$
\frac{x^2+x}{y+1}
$$
正如前文所提到的，只有在写为行间代码时，分式才能完整展开。
### 6. 函数
LaTeX 预设了基本函数，如 `\sin`, `\cos`, `\tan`, `\log` 等
> [!note] 注意：
> **重点**：**不要**直接输入 `sin(x)`，而要使用 `\sin(x)`。前者会被渲染成 $sin(x)$ (变量 s, i, n 相乘)，而后者是正确的函数格式 $\sin(x)$ (字体为正体)。

### 7. 根号
- 平方根： `\sqrt{表达式}` **例如**：$\sqrt{x}$
- N 次平方根：`\sqrt[N]{表达式}` **例如**：$\sqrt[3]{x}$
### 8. 省略号
- `\ldots`：与基线对齐的省略号，如 $a_1,a_2,\ldots,a_n$
- `\cdots`：居中的省略号，如 $a_1+a_2+\cdots+a_n$
### 9. 括号
使用 `\left(...\right)`，获得一个可以自动调整大小的括号，而不是单纯用 `()`，区别：
- 直接使用 `()`：
$$
f(x) = (\frac{\sqrt{x^2+x}+1}{x+1})^2
$$
- 使用 `\left(...\right)`：
$$
f(x) = \left(\frac{\sqrt{x^2+x}+1}{x+1}\right)^2
$$
方括号 `[]`、绝对值号 `||` 同理
### 10. 矩阵（matrix）
- **矩阵**：
	- `pmatrix`：圆括号矩阵
	- `bmatrix`：方括号矩阵
	- `vmatrix`：竖线行列式
	- `matrix`：无括号
- 语法：`&` 用于分隔列，`\\` 用于分隔行
- 示例：
$$
A = \begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\quad
I = \begin{bmatrix}
1 & 0 \\
0 & 1
\end{bmatrix}
$$
**源代码**：
```Markdown
$$
A = \begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\quad
I = \begin{bmatrix}
1 & 0 \\
0 & 1
\end{bmatrix}
$$
```
### 11. 分段函数 (cases)

$$
f(x) = \begin{cases}
	x^2, &\text{如果 } x \ge 0 \\
	-x , &\text{如果 } x < 0
\end{cases}
$$
**源代码**：
```Markdown
$$
f(x) = \begin{cases}
	x^2, &\text{如果 } x \ge 0 \\
	-x , &\text{如果 } x < 0
\end{cases}
$$
```
### 12. 多行公式对齐：align
-  `align` **环境（带编号）**/ `align*` **环境（不带编号）**
	- **语法**：
		- 在需要对齐的符号前用 `&` 标注
		- 使用 `\\` 换行
- **示例**：
$$
\begin{align*}
f(x) &= (x+y)(x-y) \\
	 &= x^2-xy+yx-y^2 \\
	 &= x^2-y^2
\end{align*}
$$
```Markdown
$$
\begin{align*}
f(x) &= (x+y)(x-y) \\
	 &= x^2-xy+yx-y^2 \\
	 &= x^2-y^2
\end{align*}
$$
```

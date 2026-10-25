# 算术化

把「算一个神经网络」翻译成「一堆多项式约束」。这是 zkML 真正难的地方，也是 EZKL 代码量最大的部分。

学完这一层，你应该能做到：**拿任意一个 ONNX 算子，说出它会被翻译成哪几类约束。**

| 级别 | 知识点 | 一句话 |
|---|---|---|

### 从计算到约束

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [电路抽象与witness](computation-to-constraints/circuit-and-witness.md) | 把程序改写成「一堆必须成立的等式」，再给每个变量赋值，这组赋值就叫 witness。 |
| 核心 | [约束数与行数](computation-to-constraints/constraints-vs-rows.md) | 约束条数决定电路逻辑对不对，行数决定证明要多久、内存要多少。两者不是一回事。 |
| 选读 | [R1CS对照](computation-to-constraints/r1cs.md) | Groth16 那套用的约束形式：每个门形如 (a·x)(b·x) = (c·x)。看懂它更容易理解 PLONKish 改进了什么。 |

### PLONKish

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [三类列](plonkish/three-column-types.md) | advice 列放见证、fixed 列放常量、instance 列放公开输入。EZKL 的五种可见性各自落在这几类列上。 |
| 核心 | [选择子与门约束](plonkish/selectors-and-gates.md) | 用选择子（0/1）开关，让同一组列在不同行执行不同运算，一个通用门搞定所有算术。 |
| 核心 | [复制约束与置换论证](plonkish/copy-constraints-permutation.md) | 同一条「线」上的值必须相等；逐个列等式太多，于是用置换 + grand product 一次性证明全部相等。 |
| 支撑 | [自定义门](plonkish/custom-gates.md) | 把常用的小运算（如椭圆曲线加、椭圆曲线倍）打包成一个门，一次吃掉多行。 |
| 核心 | [商多项式与恒等式检验](plonkish/quotient-polynomial.md) | 「所有门约束在整域上都成立」等价于「这些约束之和能被 Z_H(X) 整除」，商多项式的次数就是证据。 |

### 查找表

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [为什么需要查找表](lookup-arguments/why-lookup.md) | 电路只会加和乘；sigmoid、exp 这种函数硬算要上千行，查表只要一行加一次成员查询。 |
| 支撑 | [Plookup原理](lookup-arguments/plookup.md) | 把「值在表里」化成两个多重集的并集相等，再用排序或累积和把并集证明压成一个等式。 |
| 支撑 | [LogUp与对数导数](lookup-arguments/logup.md) | 用 1/(x−t) 这类项的对数导数，把成员关系压成一个求和等式，比 Plookup 更省 proof 空间。 |
| 选读 | [动态查找与向量查找](lookup-arguments/dynamic-vector-lookup.md) | 表本身也可以是 witness（任意张量），而且一次能查多列——EZKL 的非线性算子和 einsum 都靠这个。 |
| 核心 | [表大小与logrows代价](lookup-arguments/table-size-logrows.md) | 表有 2^bits 行；bits 每加 1，行数翻倍，SRS、内存、证明时间跟着翻。 |

### 电路布局

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 选读 | [region与column分配](circuit-layout/region-column-layout.md) | 同一批列要被上千个算子轮流复用；布局差，行数能差一倍，成本跟着差一倍。 |

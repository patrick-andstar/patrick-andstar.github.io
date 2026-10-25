# 数学地基

EZKL 里所有数字都住在有限域里，所有承诺都挂在椭圆曲线上。这一层只学「够用」的部分，不做证明题。

学完这一层，你应该能做到：**看懂 proof.json 里哪些是域元素、哪些是曲线点，并知道它们为什么不能互换。**

| 级别 | 知识点 | 一句话 |
|---|---|---|

### 有限域

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [模运算与同余](finite-fields/modular-arithmetic.md) | 只保留余数的算术：12 点加 5 小时等于 5 点。密码学里所有的「数」都在这种算术里。 |
| 核心 | [素域GF(p)与乘法逆元](finite-fields/prime-field-inverse.md) | p 是素数时，除 0 以外每个数都有乘法逆元，于是「除以 x」等价于「乘以 x 的逆元」。 |
| 核心 | [BN254的两层域](finite-fields/bn254-two-fields.md) | 标量住在 Fr（约 2^254 的素域），曲线坐标住在 Fq，两者不是一个域，不能混着算。 |

### 群与代数结构

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [群与循环群](groups/groups-and-cyclic.md) | 只有一种运算、可逆、封闭的集合；循环群里所有元素都能由生成元反复相加得到。 |
| 支撑 | [双线性配对](groups/bilinear-pairing.md) | e(aP, bQ) = e(P,Q)^{ab}：能在「算不出来」的密文上验证乘法等式。KZG 的验证只需一次配对。 |

### 椭圆曲线

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [曲线方程与点加法](elliptic-curves/curve-point-addition.md) | y² = x³ + ax + b 上的点可以「相加」：画一条线穿过两点，取第三交点再对 x 轴翻折。 |
| 核心 | [标量乘法与离散对数](elliptic-curves/scalar-multiplication.md) | k·P 正向好算（倍加），从 k·P 反推 k 极难。承诺能藏住秘密，全靠这个不对称。 |
| 支撑 | [点的表示与压缩序列化](elliptic-curves/point-compression.md) | proof.json 里那些 0x… 是压缩后的 G1 点：只存 x 和一个符号位，y 由曲线方程解出。 |
| 核心 | [BN254与BLS12-381的选型](elliptic-curves/bn254-vs-bls12-381.md) | 选 BN254 不是为了更安全，而是因为 EVM 的 ecPairing 只认它。安全等级约 100 bit。 |

### 多项式

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [求值与拉格朗日插值](polynomials/lagrange-interpolation.md) | n 个点唯一确定一个 n−1 次多项式；电路里的每一行就是一个点。 |
| 支撑 | [单位根与NTT](polynomials/roots-of-unity-ntt.md) | 在 2^k 次单位根上求值，插值和求值都能做到 O(n log n)，而且是并行的。 |
| 核心 | [多项式恒等式与Schwartz-Zippel](polynomials/schwartz-zippel.md) | 两个多项式若在随机点上相等，则大概率恒等；次数越高，蒙对的概率越低。 |
| 选读 | [低度测试与FRI](polynomials/fri-low-degree-test.md) | STARK 系用的另一条路线：不用可信设置，靠 Merkle 树 + 反复折叠证明「次数够低」。 |

# 算子lowering

> **核心** ｜ 前置：05_zkML层/01_模型表示/01_ONNX图结构

**一句话**：每个 ONNX 算子映射成一个 chip：算术、查表、einsum、reshape。不是所有算子都支持。

**在 EZKL 里的落点**：src/graph/modules.rs、src/circuit/ops/。

!!! question "自检（能答上来就算过）"
    举 3 个算子，说明它们各自落到哪种 chip。

---

> 读完约 8 分钟。这一篇解释「为什么有些模型能跑、有些一上来就报错」。

## 一、lowering 是什么意思

编译原理里有个词叫 lowering：把高层结构翻译成低层原语。

在 EZKL 里：

> **ONNX 算子 → 电路原语（chip）**

一个 ONNX 模型可能有 50 种算子，但电路只会几种原语。所以每个算子都得找到一个「落脚点」，找不到就报错。

## 二、五类算子，五种落点

| 类型 | 例子 | 落到哪 | 成本 |
|---|---|---|---|
| 算术 | Add、Mul、MatMul、Conv | 通用门 / einsum chip | 低（每元素几行） |
| 激活 | Relu、Sigmoid、Tanh、Gelu | 查表 | 中（一次查询 + 表） |
| 形状 | Reshape、Transpose、Flatten | **几乎免费**（只改索引） | 极低 |
| 归一化 | LayerNorm、BatchNorm、Softmax | 求和 + 除法 + 开方 | **高** |
| 池化 | MaxPool、AveragePool | 比较 / 累加 | 中（MaxPool 要逐元素比大小） |

**注意第三行**：形状变换不改数值，只改「哪个格子的值对应哪个位置」，所以几乎零成本。这也是为什么 `Reshape` 在电路里是「免费」的，而在 GPU 上反而要搬内存。

## 三、为什么有些算子不支持

三类原因：

1. **需要动态控制流**：`If`、`Loop`、`Scan` —— 电路是静态的，没有分支；
2. **形状依赖数据**：`NonZero`、`Unique`、动态 `Reshape` —— 编译期算不出行数；
3. **没人实现**：单纯是工程量问题，比如某些冷门算子。

前两类是原理性的（永远做不了），第三类是可补的。

## 四、落到 EZKL 的代码上

- `src/graph/modules.rs`：定义「ONNX 算子 → 内部 module」的映射表；
- `src/circuit/ops/`：
  - `base.rs`：算术
  - `lookup.rs`：查表类（Sigmoid、Tanh、Div…）
  - `hybrid.rs`：查表 + 算术混合
  - `poly.rs`：多项式类
- `src/graph/utilities.rs`：处理算子属性（axis、stride 等）。

`ezkl table -M model.onnx` 会把每个节点的算子列出来，你能直接看到有没有「unsupported」。

## 五、一个容易被低估的成本

**MaxPool 比你想的贵。**

它要逐元素比较大小，而电路里「比较」不是一条指令：得把数拆成位，或者用查表。一个 2×2 的 MaxPool，看起来只是取最大值，实际约束数可能是同尺寸 AveragePool 的好几倍。

同理，`ArgMax`（分类头常用）在电路里非常贵 —— 因为它是「全局比较」。

**实践建议**：如果模型最后有 ArgMax，考虑把它挪到电路外（让验证方自己从输出的 10 个分数里取最大），电路只证「这 10 个分数算对了」。

## 六、自检答案

> 问：举 3 个算子，说明它们各自落到哪种 chip。

答：`Conv` 落到 einsum chip（张量收缩，展开成矩阵乘）；`Sigmoid` 落到查找表（`LookupOp::Sigmoid`，一次成员查询）；`Reshape` 几乎不落 chip，只改张量的索引映射，成本接近零。如果是 `LayerNorm`，则落到「求和 + 查表除法 + 开方查表」的组合，属于最贵的一类。

## 七、一句话记住

**lowering 就是给每个算子找落脚点。找不到的，不是「慢」，是「做不了」。**

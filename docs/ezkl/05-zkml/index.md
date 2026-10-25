# zkML 层

EZKL 相对通用 zk 框架的增量全在这：ONNX 图、定点量化、查表非线性。也是所有「证明通过但结果错了」的来源。

学完这一层，你应该能做到：**定位一次「证明有效但预测错」的故障，究竟出在量化、查表还是范围检查。**

| 级别 | 知识点 | 一句话 |
|---|---|---|

### 模型表示

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [ONNX图结构](model-representation/onnx-graph.md) | 节点是算子，边是张量，属性是超参。EZKL 用 tract 读图，按拓扑序逐个降级成 chip。 |
| 核心 | [算子lowering](model-representation/operator-lowering.md) | 每个 ONNX 算子映射成一个 chip：算术、查表、einsum、reshape。不是所有算子都支持。 |
| 核心 | [卷积与einsum](model-representation/conv-einsum.md) | 卷积先展开成 einsum（张量收缩），再变成矩阵乘约束；stride/padding 在展开时就被吸收。 |

### 定点量化

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [scale与定点表示](fixed-point-quantization/fixed-point-scale.md) | 用整数存小数：真实值 = 整数 × 2^-s。整张图必须共用一个或少数几个 scale。 |
| 核心 | [量化误差与校准](fixed-point-quantization/quantization-calibration.md) | scale 太大溢出、太小丢精度；calibrate-settings 就是在 (scale, bits, logrows) 里搜平衡点。 |
| 核心 | [溢出为何仍能出合法证明](fixed-point-quantization/overflow-still-valid.md) | 电路只保证「约束都成立」，不保证「语义对」。量化溢出后，证明照样 verify=true。 |
| 核心 | [范围检查与bits](fixed-point-quantization/range-check-bits.md) | 每个中间值都要证明落在 [−2^b, 2^b)；没有范围检查，溢出就无法被发现。 |
| 核心 | [精度与规模的权衡](fixed-point-quantization/precision-vs-size.md) | scale、bits、logrows 三者互相牵制，构成一条成本曲线；精度每提一档，行数会跳一级。 |

### 非线性算子

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [查表近似](nonlinear-ops/lookup-approximation.md) | sigmoid / tanh / gelu / exp 全部预计算成表，电路里只做一次成员查询；表的精度就是模型的精度。 |
| 支撑 | [除法与倒数](nonlinear-ops/division-reciprocal.md) | 电路里没有除法，只有「先猜一个商、再乘回去验一下」或直接查表。 |
| 核心 | [Softmax与LayerNorm](nonlinear-ops/softmax-layernorm.md) | 两者都要「除以一个和或标准差」，是整张图里最贵的部分之一，也是行数暴涨的常见原因。 |
| 核心 | [近似误差与语义正确性](nonlinear-ops/approximation-tolerance.md) | 查表误差会逐层累积；证明没问题、数值偏了，是 zkML 的常态而不是 bug。 |

### 语义边界

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [证明的到底是什么](semantics/what-is-proven.md) | y = f(x; w) 这一次计算的完整性。不证「模型好」、不证「数据真」、不证「训练过程」。 |
| 核心 | [五种可见性](semantics/five-visibilities.md) | 五种：private / public / fixed / hashed / polycommit，决定谁看得见、进不进公开区。 |
| 支撑 | [公开输入的承诺化](semantics/public-input-commitment.md) | 公开输入太大时，用 Poseidon 哈希或 KZG 承诺把它压掉，省下随张量线性增长的验证开销。 |
| 核心 | [可验证推理vs可验证训练](semantics/inference-vs-training.md) | 训练的反向传播与优化器状态上不了电路；所以 zkML 全部集中在推理。这是天花板，不是懒。 |
| 核心 | [模型完整性vs推理完整性](semantics/model-vs-inference-integrity.md) | 哈希/签名只能证「文件没变」；ZK 才能证「用的就是这份权重，而且算对了」。两者缺一个都会漏。 |

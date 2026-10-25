# 证明系统

EZKL 用的是 Halo2 + KZG。这一层讲这套协议怎么把上百万行约束压成一个 19KB 的 proof.json。

学完这一层，你应该能做到：**按顺序讲完 prove 的五个阶段，并说明 verify 为什么是常数时间。**

| 级别 | 知识点 | 一句话 |
|---|---|---|

### 证明的三性质

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [完备性可靠性零知识](three-properties/completeness-soundness-zk.md) | 真话一定通过（完备）、假话几乎不可能通过（可靠）、通过也看不出秘密（零知识）。 |
| 支撑 | [知识抽取与模拟器](three-properties/extractor-simulator.md) | 可靠性要证「存在一个抽取器能拿出 witness」；零知识要证「存在一个模拟器能伪造整个 transcript」。 |
| 支撑 | [可靠性误差与安全参数](three-properties/soundness-error.md) | 单次欺骗概率要压到 2^-100 以下才算够；查找表、置换、多开点各有一份误差要相加。 |

### Halo2协议

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [证明生成全流程](halo2-protocol/proof-generation.md) | 承诺 witness → 取挑战 → 算商多项式 → 多开点归约 → 输出 proof。五步，一步都不能省。 |
| 核心 | [多开点归约](halo2-protocol/multiopen.md) | 十几个多项式、好几个求值点，先用随机系数揉成一个，再用一次 KZG 打开。 |
| 支撑 | [KZG与IPA的取舍](halo2-protocol/kzg-vs-ipa.md) | IPA 不需要可信设置但 proof 随电路规模对数增长；KZG proof 恒定但要 SRS。v23 已删掉 IPA。 |
| 选读 | [递归与聚合证明](halo2-protocol/recursion-aggregation.md) | 大电路拆小、各自出证明、再递归合成一个。听起来能救大模型，但 v23 已经删掉 aggregation circuit。 |

### 密钥与产物

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [compile约束系统固化](keys-and-artifacts/compile.md) | 把 ONNX 图变成固定列写死的电路；结构定死之后才能生成密钥，也才能算出需要多少行。 |
| 核心 | [setup与pk-vk](keys-and-artifacts/setup-pk-vk.md) | pk 是证明者的密钥（几百 MB），vk 是验证者的密钥（百来 KB）；两者都从电路 + SRS 生成。 |
| 支撑 | [witness生成与盲化](keys-and-artifacts/witness-blinding.md) | 把输入量化、代入电路、加盲化因子，产出 witness.json；盲化因子让同一输入的两次证明不可区分。 |
| 核心 | [prove与verify内部](keys-and-artifacts/prove-verify.md) | prove 产出 19KB 的 proof.json；verify 只做几次配对与群运算，跟电路多大无关。 |
| 核心 | [vk绑定结构还是权重](keys-and-artifacts/vk-binds-weights.md) | param_visibility=fixed 时 vk 绑死权重；=private 时 vk 只绑结构，权重走 witness。这一行决定你的系统能不能换模型。 |

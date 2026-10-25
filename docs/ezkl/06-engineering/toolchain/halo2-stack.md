# halo2三件套分工

> **支撑** ｜ 前置：04_证明系统/02_Halo2协议/01_证明生成全流程

**一句话**：halo2_proofs 出协议、halo2curves 出曲线、snark-verifier 出验证器；ezkl 自己写的是「模型→电路」这一层。

**打个比方**：EZKL 自己是翻译官，把模型翻成电路；真正干活的锁匠（协议、曲线、验证器）是 halo2 那三个库。

**在 EZKL 里的落点**：Cargo.toml 的三个 git 依赖。

!!! question "自检（能答上来就算过）"
    说清「ezkl 自己写了什么、复用了什么」，这决定你改代码该改哪儿。

---

> 读完约 7 分钟。这一篇是「改代码之前必读」——搞清楚边界，才不会在错误的地方找问题。

## 一、三个依赖

`Cargo.toml` 里最关键的三行：

```toml
halo2_proofs    = { git = ".../zkonduit/halo2", ... }
halo2curves     = { git = ".../halo2curves", ... }
snark-verifier  = { git = ".../zkonduit/snark-verifier", ... }
```

| 库 | 管什么 | 你什么时候会碰它 |
|---|---|---|
| **halo2_proofs** | 证明协议：约束系统、多项式、transcript、prove/verify | 几乎不碰（除非改协议） |
| **halo2curves** | 曲线与域的算术：BN254、Fr、G1/G2 | 几乎不碰 |
| **snark-verifier** | 通用验证器，可生成 Solidity/EVM 验证代码 | 只在链上验证时碰（本项目已删该分支） |

## 二、EZKL 自己写的部分

| 目录 | 职责 |
|---|---|
| `src/graph/` | ONNX 图解析、算子 lowering、可见性配置 |
| `src/tensor/` | 张量表示、量化、形状推断 |
| `src/circuit/ops/` | 各种算子的电路实现（算术、查表、einsum） |
| `src/circuit/modules/` | Poseidon chip、polycommit chip、planner |
| `src/pfsys/` | 证明系统的封装（调 halo2 + 管 SRS） |
| `src/commands.rs` | CLI 的 22 个枚举项（含 EVM 相关分支） |

**一句话**：EZKL 是「翻译官」，把模型翻译成 halo2 能吃的电路；真正干活的锁匠是 halo2。

## 三、这个边界决定了排查方向

遇到问题，先判断它在哪一层：

| 现象 | 大概率在哪 |
|---|---|
| 算子不支持、形状对不上 | `src/graph`（EZKL 自己） |
| 行数估错、编译失败 | `src/graph/mod.rs` 的 settings 计算 |
| 证明生成慢 | halo2 的 MSM/NTT（不是 EZKL 能改的） |
| 验证失败但参数都对 | 先查序列化，再查 halo2 版本 |
| 电路约束写错 | `src/circuit/ops`（EZKL 自己） |

**经验**：90% 的问题在 `src/graph` 和 `src/tensor`，也就是「翻译」这一层，而不是密码学那一层。

## 四、halo2 的 fork 改了什么

zkonduit 的 fork 开了两个特性：

- `circuit-params`：允许运行时传电路参数（标准 halo2 是编译期常量）；
- `mv-lookup`：多值/向量查找（`03/03/04`）。

这两个改动都是为 zkML 服务的：模型规模动态变化，需要运行时参数；非线性算子需要一次查多列。

**注意**：这意味着 EZKL 用的是**非标准 halo2**。你不能直接换成 upstream 的 halo2 而不改代码。

## 五、如果你要改代码

三条建议：

1. **先读 `src/circuit/ops/base.rs`**：这是所有算子的模板，看懂一个就懂一片；
2. **别碰 `src/pfsys`**：它只是薄封装，改它收益低风险高；
3. **加新算子**：在 `ops/` 加一个实现 + 在 `graph/modules.rs` 注册 + 在 `table.rs` 加查找表（如果是查表类）。

## 六、自检答案

> 问：说清「EZKL 自己写了什么、复用了什么」，这决定你改代码该改哪儿。

答：复用 halo2_proofs（协议与证明生成）、halo2curves（曲线与域运算）、snark-verifier（验证器）；自己写的是「模型 → 电路」这一层：ONNX 解析与 lowering、张量量化、各算子的电路实现、settings 与行数估算、CLI。所以要加算子或改支持范围，改 `src/graph` 和 `src/circuit/ops`；要改性能或协议，得动 halo2 上游（基本不可行）。

## 七、一句话记住

**EZKL 是翻译官，halo2 是锁匠。90% 的问题出在翻译，不在锁。**

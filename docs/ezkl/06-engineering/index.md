# 工程边界

能跑通不等于能用。成本模型、攻击面、审计、许可证、版本破坏性变更——这些决定它能不能进项目。

学完这一层，你应该能做到：**用行数估出一次 prove 的时间与内存，并判断目标模型是否可行。**

| 级别 | 知识点 | 一句话 |
|---|---|---|

### 工具链

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 支撑 | [halo2三件套分工](toolchain/halo2-stack.md) | halo2_proofs 出协议、halo2curves 出曲线、snark-verifier 出验证器；ezkl 自己写的是「模型→电路」这一层。 |
| 支撑 | [pyo3绑定与常驻进程](toolchain/pyo3-daemon.md) | CLI 冷启动约 1.3 秒，进程内 verify 只要 50 毫秒；1 秒指标的胜负全在这里。 |
| 核心 | [七个命令与文件格式](toolchain/seven-commands.md) | 每个命令吃什么、吐什么、产物之间怎么串；搞错一个参数（如 param-visibility）整个结论就反了。 |

### 性能

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [成本模型](performance/cost-model.md) | prove 约 40 µs/行、setup 约 56 µs/行、pk 约 4.3 KB/行、SRS 128 B/行（本项目 32 线程实测）。 |
| 支撑 | [内存与并行](performance/memory-parallelism.md) | k 每加 1，内存翻倍；大模型先撞内存墙，再撞时间墙。 |
| 选读 | [GPU加速](performance/gpu-acceleration.md) | icicle 后端可把 MSM 搬到 GPU；是 feature flag，不是默认路径，且有额外编译成本。 |

### 安全与边界

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [可信设置假设](security-and-limits/trusted-setup-assumption.md) | 整套安全性依赖「τ 已被销毁」；SRS 来源不明，等于没有安全，只是看起来有。 |
| 核心 | [审计与版本破坏性变更](security-and-limits/audit-and-versioning.md) | v21 过 Trail of Bits 审计；v23 删了 IPA、聚合电路、JS/WASM 绑定，README 却还写着能在浏览器验证。 |
| 核心 | [许可证与商用](security-and-limits/license.md) | 仓库根目录没有 LICENSE，只有 CLA。默认是「保留所有权利」，商用交付前必须谈授权。 |

### 攻击面

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 支撑 | [witness泄露](attack-surface/witness-leak.md) | 协议本身不泄露 witness，但 witness.json 是硬盘上的一个文件。谁能读到它，谁就直接看见了全部输入和权重。 |
| 支撑 | [量化反演与模型窃取](attack-surface/model-extraction.md) | 只公开输出时，攻击者能靠大量「输入—输出」对反推模型。输出精度越低，反推越难——低精度反而成了一层意外的保护。 |
| 核心 | [恶意SRS与有毒废料](attack-surface/malicious-srs.md) | SRS 是别人生成的，那个人就可能留着「有毒废料」（τ）。留着 τ 的人能伪造任何证明，而且看不出来。 |
| 支撑 | [无效曲线点与子群检查](attack-surface/invalid-curve-points.md) | 塞一个不在曲线上的点进去，配对结果就失去意义，证明可能被伪造。所以验证器必须先检查「这个点在曲线上、且在正确的子群里」。 |

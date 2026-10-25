# EZKL七步流水线

> **核心** ｜ 前置：00_直觉入门/01_陈述与见证

**一句话**：table → gen-settings → compile → setup → gen-witness → prove → verify，七个命令、七种产物。

**在 EZKL 里的落点**：src/commands.rs 的 Commands 枚举，就是这七步（另外还有几个我们用不到的分支）。

!!! question "自检（能答上来就算过）"
    不看文档，画出七步的输入输出箭头，并说出哪一步最慢、哪一步最占磁盘。

---

> 读完约 9 分钟。这一篇是「地图」，后面每一层知识都挂在这七步的某一格上。

## 一、先看全景

EZKL 的核心就是七个命令，每个吐一个文件，后一个吃前一个的输出。

| # | 命令 | 吃什么 | 吐什么 | 在干嘛 |
|---|---|---|---|---|
| 1 | `table` | `model.onnx` | 屏幕上的一张表 | 读模型，列出所有算子，看支不支持 |
| 2 | `gen-settings` | `model.onnx` | `settings.json` | 估算电路要多少行、量化用多少位 |
| 3 | `calibrate-settings` | 模型 + 一些样本数据 | 改好的 `settings.json` | 搜索 (scale, lookup_range, logrows) 的平衡点 |
| 4 | `compile-circuit` | `model.onnx` + `settings.json` | `model.compiled` | 把模型翻译成电路，结构定死 |
| 5 | `setup` | `model.compiled` + `kzg16.srs` | `pk.key` + `vk.key` | 生成证明密钥和验证密钥 |
| 6 | `gen-witness` | `model.compiled` + `input.json` | `witness.json` | 把这次输入代进去，填满每个格子 |
| 7 | `prove` | witness + `model.compiled` + `pk.key` | `proof.json` | 出证明 |
| 7b | `verify` | `proof.json` + `vk.key` + `settings.json` + SRS | 一个布尔值 | 验证明 |

## 二、四件必须搞清楚的事

**1. `settings.json` 决定成本，不是模型单方面决定成本。**
同一个模型，`logrows` 加 1，行数翻倍、`pk` 翻倍、证明时间翻倍。所以第 2、3 步不是「配置」，是「预算」。

**2. `compile` 之后，电路结构就冻住了。**
加一层、换一种激活函数，都得重跑 `compile` + `setup`。这就是为什么「联邦学习每轮换模型」在默认配置下走不通（`04/03/05`）。

**3. 只有 `setup` 和 `prove`/`verify` 需要 SRS。**
SRS 是那份公共参数（例子里的 `kzg16.srs` 只有 8.4 MB），`logrows` 越大要的 SRS 越大。

**4. 权重放哪儿，是第 2 步定下的。**
`gen-settings` 默认 `param_visibility=private`——权重走 witness，vk 只绑结构。要真正绑死模型，必须显式加 `--param-visibility fixed`。这一行决定你的系统「能不能换模型」。

## 三、本项目实测（32 线程 CPU，示例 `3l_relu_conv_fc`）

| 步骤 | 耗时 | 产物大小 |
|---|---|---|
| `gen-settings` | 0.08 s | 几 KB |
| `calibrate-settings` | 2.8–3.0 s | — |
| `compile-circuit` | 约 0.03 s | 66 KB |
| `setup` | 4.3–4.9 s | `pk` 265 MB / `vk` 132 KB |
| `gen-witness` | 0.16 s | 约 120 KB |
| `prove` | 2.9–4.2 s | `proof.json` 19 KB |
| `verify` | 端到端 67–78 ms，其中纯验证约 3 ms | — |

全套 17 秒跑完。注意这个例子只有 3 万多行——**规模上去之后，这些数字会以「每行多少微秒」的方式线性膨胀**（`06/02/01`）。

## 四、一个反直觉的结论：1 秒指标的敌人不是密码学

本项目三次实测：`verify` 端到端 78 / 77 / 67 ms，而日志里那句 `verify took 0.3` 其实是 **0 秒 + 3 毫秒**（毫秒位不补零，`0.3` 是 3 ms，不是 0.3 s）。

所以 70 毫秒里：

- 启动一个 33 MB 的二进制；
- 从磁盘读 `vk.key` 并反序列化；
- 读 8.4 MB 的 `kzg16.srs`（最大的一块 IO）；
- 真正的密码学：约 3 ms。

**密码学只占 5%。** 所以如果指标是「验证 ≤ 1 秒」，命令行本来就达标；要拼吞吐才需要常驻服务、预加载 vk 与 SRS（`06/01/02`）。

## 五、自检答案

> 问：不看文档，写出七步的产物名。

答：`settings.json` →（校准后仍是 `settings.json`）→ `model.compiled` → `pk.key` + `vk.key` → `witness.json` → `proof.json` → 布尔值。第 1 步 `table` 不产物文件，只是让你确认算子都被支持。

## 六、一句话记住

**七个命令 = 七次「把上一份产物变成下一份产物」。卡住时，先判断是哪一份产物不对，而不是从头重跑。**

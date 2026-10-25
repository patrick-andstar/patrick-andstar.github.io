# 七个命令与文件格式

> **核心** ｜ 前置：00_直觉入门/05_EZKL七步流水线

**一句话**：每个命令吃什么、吐什么、产物之间怎么串；搞错一个参数（如 param-visibility）整个结论就反了。

**在 EZKL 里的落点**：src/commands.rs；settings.json / vk.key / pk.key / proof.json。

!!! question "自检（能答上来就算过）"
    不看文档，写出七步各自的核心产物名与文件大小量级。

---

> 读完约 8 分钟。这一篇是操作手册，卡住时直接查表。

## 一、命令与产物

| # | 命令 | 输入 | 输出 | 产物大小（本项目） |
|---|---|---|---|---|
| 1 | `table` | `model.onnx` | 屏幕表格 | — |
| 2 | `gen-settings` | `model.onnx` | `settings.json` | 几 KB |
| 3 | `calibrate-settings` | 模型 + `data.json` | 改写 `settings.json` | 几 KB |
| 4 | `compile-circuit` | 模型 + `settings.json` | `model.compiled` | 66 KB |
| 5 | `setup` | `model.compiled` + `kzg16.srs` | `pk.key` + `vk.key` | 265 MiB / 132 KB |
| 6 | `gen-witness` | `model.compiled` + `input.json` | `witness.json` | 约 120 KB |
| 7 | `prove` | `witness.json` + `model.compiled` + `pk.key` + srs | `proof.json` | 19 KB |
| 8 | `verify` | `proof.json` + `vk.key` + `settings.json` + srs | `true/false` | — |

## 二、依赖关系（谁离不开谁）

```
model.onnx
  ├→ settings.json ──┐
  └──────────────────┴→ model.compiled ─┬→ pk.key ─┐
                                        └→ vk.key   │
kzg16.srs ──────────────────────────────────────────┼→ proof.json
input.json ─→ witness.json ─────────────────────────┘
                                    settings.json + vk + srs ─→ verify
```

三条容易记错的（已按 v23 的命令参数校正）：

1. **`gen-witness` 不需要 pk，但要 `model.compiled`**；如果配置里有 `hashed` 张量，还要 `-V vk.key -P srs` 才能算出 KZG 承诺；
2. **`prove` 需要 `model.compiled`**（`-M`），不是「只要有 witness + pk」——它要按电路结构把值填表；
3. **`verify` 需要 `settings.json` 和 SRS**，不是只要 vk + proof。公开输入不用单独给文件，它在 `proof.json` 的 `instances` 字段里。

## 三、哪些文件能删

| 文件 | 能否删 | 说明 |
|---|---|---|
| `model.onnx` | 不能 | 重编译要用 |
| `settings.json` | 不能 | 记录所有参数，重跑的依据 |
| `model.compiled` | 不能 | 重新 compile 要几十毫秒，可接受，但建议留 |
| `pk.key` | 可重生成，但很贵（4–5 秒 + 265 MB） | 建议留 |
| `vk.key` | 不能 | 丢了就要重跑 setup |
| `witness.json` | **应该删** | 含隐私，用完即删（`06/04/01`） |
| `proof.json` | 留 | 这是交付物 |
| `kzg16.srs` | 可重下 | 建议留 + 校验哈希 |

## 四、几个命令的隐藏参数

**`gen-settings`**
- `--param-visibility fixed|private|hashed`：决定 vk 绑不绑权重（`04/03/05`）；
- `-K`：手动指定 logrows，**给大了会按 2^K 分配张量，内存爆炸**。

**`calibrate-settings`**
- `--target resources|accuracy`：优化目标（`05/02/02`）；
- `--max-logrows`：限制搜索上限，大模型必加。

**`gen-witness`**
- `-V vk.key -P kzg.srs`：配置里有 `hashed` 时必须给，否则承诺生成不出来。

**`verify`**
- 返回一个 JSON：`{"verified": true}` 或 `false`，不是退出码。

## 五、文件格式速查

| 扩展名 | 内容 | 可否手改 |
|---|---|---|
| `.onnx` | 模型 | 不建议 |
| `.json`（settings） | 参数 | 可以，改完要重 compile |
| `.compiled` | 序列化的电路 | 不能 |
| `.key` | 密钥 | 不能 |
| `.srs` | 公共参数 | 不能（改了全废） |
| `.json`（witness/proof） | 数据/证明 | 不能（改了验证失败） |

## 六、一条实用的排错顺序

`verify: false` 时，按这个顺序查：

1. **参数**：`param_visibility`、`bits`、`scale` 是不是前后一致；
2. **版本**：`settings.json` 里的 ezkl 版本和当前二进制是否匹配；
3. **文件**：是不是手改过 proof / witness，或改过 `proof.json` 里的 `instances` 字段；
4. **密钥**：vk 是不是这个电路生成的；
5. **最后**才怀疑密码学。

实践中前四条占九成。

## 七、自检答案

> 问：不看文档，写出七步各自的核心产物名与文件大小量级。

答：`settings.json`（几 KB）→ 校准后仍是 `settings.json` → `model.compiled`（几十 KB）→ `pk.key`（几百 MB）+ `vk.key`（几百 KB）→ `witness.json`（几十 KB 到几 MB）→ `proof.json`（约 19 KB）→ 布尔值。注意 `table` 不产物文件。

## 八、一句话记住

**prove 要 witness + compiled + pk + srs；verify 要 proof + vk + settings + srs。公开输入不用单独文件，它在 proof.json 里。**

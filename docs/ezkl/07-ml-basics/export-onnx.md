# 模型导出与ONNX

> **支撑** ｜ 前置：07_机器学习预备/02_张量与形状

**一句话**：PyTorch 训完导成 ONNX：一份「算子清单 + 权重」的通用文件，跟框架无关。EZKL 只认它。

**在 EZKL 里的落点**：tract-onnx；ezkl table 就是读这个文件。

!!! question "自检（能答上来就算过）"
    说清 ONNX 里权重存在哪、算子怎么描述、为什么换框架还能读。

---

> 读完约 7 分钟。这一篇是操作清单，照做能省掉一半调试时间。

## 一、最小可用代码

```python
import torch

model.eval()                    # 关键！见下
dummy = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model, dummy, "model.onnx",
    input_names=["input"],
    output_names=["output"],
    opset_version=13,           # 显式指定
    dynamic_axes=None,          # 不要动态轴
)
```

## 二、五个必查项

**第一，`model.eval()`。**

不设的话：

- dropout 还在生效 → 每次输出不同；
- BatchNorm 用当前 batch 的统计量 → batch=1 时方差为 0，输出失真。

在 ZK 里后果更严重：**同一个输入两次证明对不上**（`07/06`）。

**第二，显式指定 opset。**

不指定就用默认（可能很新）。EZKL 用的 tract 对 opset 有支持范围，太新会读不出来。

推荐 13–17。

**第三，不要动态轴。**

`dynamic_axes={"input": {0: "batch"}}` 会让形状在运行时才确定，而电路必须在编译期知道形状。

**第四，检查输出是否一致。**

```python
import onnxruntime as ort
# 对比 torch 和 ort 的输出，误差应 < 1e-5
```

不一致通常意味着某个算子在导出时被改写（比如 fold 了 BN）。

**第五，用 `ezkl table` 验一遍。**

```bash
ezkl table -M model.onnx
```

看每个算子是否 supported。这一步能在 10 秒内告诉你「这个模型能不能跑」。

## 三、常见导出问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 算子 unsupported | 用了冷门算子 | 换等价算子重写 |
| 形状对不上 | reshape 链断了 | 用固定 batch=1 导出 |
| 输出差很多 | 忘了 eval | 加 `model.eval()` |
| 文件巨大 | 权重没压缩 | 正常（ONNX 不压缩） |
| 读不出来 | opset 太新 | 降到 13 |

## 四、一个容易忽略的细节

**PyTorch 会在导出时做「常量折叠」。**

比如 Conv + BatchNorm 会被折叠成一个 Conv（因为 BN 在推理时是仿射变换，`07/05`）。

这**对 ZK 是好事**：少一层就少一批行。

但你也要知道：**导出的图和你写的代码不是一一对应的**。调试时看到「少了一层」，别慌。

## 五、导出之后做什么

标准流程：

1. `ezkl table` → 确认算子
2. `ezkl gen-settings` → 看 `num_rows`
3. 按 `06/02/01` 的成本模型估时间/内存
4. 觉得可以，再跑完整流水线

**别一上来就跑 `calibrate-settings`** —— 大模型上它可能跑十几分钟（`05/02/02`）。

## 六、自检答案

> 问：说清 ONNX 里权重存在哪、算子怎么描述、为什么换框架还能读。

答：权重存在 `initializer` 里，是一组命名张量（如 `conv1.weight`）；算子描述在 `node` 里，每个节点有 `op_type`（如 Conv）、输入输出名和属性表（kernel_shape、strides、pads）。因为 ONNX 定义的是算子语义与图连接关系，与训练框架无关，所以 PyTorch 导出的文件可以被 ONNX Runtime、tract、EZKL 等不同后端读取。

## 七、一句话记住

**导出五个必查：eval 模式、固定 opset、不要动态轴、对比输出、跑 table。**

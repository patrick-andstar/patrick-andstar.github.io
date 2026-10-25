# 五种可见性

> **核心** ｜ 前置：04_证明系统/03_密钥与产物/05_vk绑定结构还是权重

**一句话**：五种：private / public / fixed / hashed / polycommit，决定谁看得见、进不进公开区。

**打个比方**：五种处理：自己留着（private）、贴公告栏（public）、焊进电路（fixed）、只贴指纹（hashed）、贴封条（polycommit）。

**在 EZKL 里的落点**：src/graph/vars.rs 的 Visibility 枚举。

!!! question "自检（能答上来就算过）"
    说清五种可见性的区别，尤其是 hashed 与 polycommit 不是一回事。

---

> 读完约 9 分钟。这一篇是配置层面的核心。
> **纠正**：我原来写「三种可见性」，读完 `src/graph/vars.rs` 的枚举才发现是**五种**。

## 一、枚举里的五种

`src/graph/vars.rs` 的 `Visibility`：

| 枚举值 | 字符串写法 | 落到哪 | 谁能看见 |
|---|---|---|---|
| `Private` | `private` | advice 列 | 没人（被承诺藏住） |
| `Public` | `public` | instance 列 | **所有人**（明文） |
| `Fixed` | `fixed` | fixed 列 | 间接（vk 绑定） |
| `Hashed{hash_is_public, outlets}` | `hashed/public` 或 `hashed/private/{outlets}` | advice + 哈希 | 只有哈希 |
| `KZGCommit` | **`polycommit`** | KZG 承诺（曲线点） | 只有承诺点 |

默认是 `Private`。

**两个坑，一起说：**

1. **枚举名和字符串名不一样**（`KZGCommit` ↔ `polycommit`）。你写 `kzgcommit` 是不认的。
2. **写错不是报错，是静默退回 private**。源码 `From<&str>` 的兜底分支是 `log::error!` 加 `log::warn!`，然后 `Visibility::Private`。也就是说你把 `--param-visibility fxied` 拼错，程序照跑，只是权重悄悄变成了私密——**验证方看不出任何异常，但你的「模型完整性」已经没了**。

第 2 条建议写进你们的上线检查表：**跑完 `gen-settings` 后，打开 `settings.json` 肉眼确认三个 `*_visibility` 字段**。

## 二、一个容易踩的坑：public 是「给全世界」

很多人以为 `public` 是「给验证者看」。

实际上：公开输入在 `proof.json` 的 `instances` 字段里，是**明文十六进制**，任何拿到 `proof.json` 的人都能读。所以 `public` 的真实含义是「**公开**」，不是「**对验证方公开**」。

如果你的输入是用户隐私数据，设成 `public` 就等于公开发布。

## 三、hashed 有两种形态

`Hashed` 带两个参数，于是有两种写法：

| 写法 | `hash_is_public` | 含义 |
|---|---|---|
| `hashed/public` | true | 哈希值直接进公开区，谁都能读 |
| `hashed/private/{outlets}` | false | 哈希作为 advice 喂回计算图，只影响列出的那几个输出 |

`outlets` 是一串输出编号（`hashed/private/0,1`），表示「这个哈希会影响哪几路输出」。这是 EZKL 里比较少见的精细控制，一般用不上。

实现上用 **Poseidon**（`src/circuit/modules/poseidon.rs` 的 `Pow5Chip`）：原文留在 advice 里参与计算，同时算一个哈希出去。

**代价**：一次 Poseidon 约几百条约束（`02/01/03`）。

## 四、polycommit 是另一回事，别和 hashed 混

这是我这轮改动最大的地方。

`polycommit` 对应枚举 `KZGCommit`，它**不是哈希，是 KZG 承诺**。证据在 `src/circuit/modules/polycommit.rs`：

```rust
pub fn commit<Scheme: CommitmentScheme<...>>(message: Vec<Scheme::Scalar>, ...) -> Vec<G1Affine> {
    // 把 message 按 n 个一组切成若干多项式
    poly[x][y] = *m;
    // 逐段做 KZG 承诺
    params.commit_lagrange(&a, Blind::default())
}
```

它返回的是 **`Vec<G1Affine>`**（曲线点），不是 32 字节的哈希。

一个必须说的坑：**这个文件的头注释写着「An easy-to-use implementation of the Poseidon Hash」**——那是从 `poseidon.rs` 复制过来的，与函数体不符。别信注释，信 `params.commit_lagrange`。

**我诚实说明不知道的部分**：`module_requires_polycommit()` 证明它是一条独立路径，但我在 `src/` 里没找到「电路内如何校验这个承诺」的对应 gate。所以只能说「它产出承诺点、由模块路径处理」，不能替它编一个绑定机制。要用这条路径，先自己跑通再写进方案。

## 五、怎么配（建议）

| 张量 | 建议 | 理由 |
|---|---|---|
| 模型输入 | `private`（除非客户要公开） | 输入常含隐私 |
| 模型输出 | `public` | 结论要给人看 |
| 权重 | `private` + 单独哈希，或 `fixed` | 兼顾「能换」与「可验证」（`04/03/05`） |
| 中间激活 | `private` | 没人需要看 |

实测默认值（`gen-settings` 不给任何参数时）：`param_visibility=Private`、`input_visibility=Private`、`output_visibility=Public`。**这个默认组合的意思是「权重和输入都藏起来，只公开输出」**，对多数推理服务是合理的。

## 六、和三类列的对应

`03/02/01` 讲的三类列，映射关系是：

- `private` → advice
- `public` → instance
- `fixed` → fixed
- `hashed` → advice + 哈希（进 instance 或回灌计算图）
- `polycommit` → 承诺点（进公开区，具体绑定方式见上一节的保留意见）

## 七、自检答案

> 问：枚举里有几种可见性？`hashed` 和 `polycommit` 的区别是什么？

答：五种：`Private`、`Public`、`Fixed`、`Hashed`（含 `hashed/public` 与 `hashed/private/{outlets}` 两种写法）、`KZGCommit`（字符串名 `polycommit`）。`hashed` 用 Poseidon 算一个 32 字节哈希，代价是电路里多几百条约束；`polycommit` 用 KZG 对张量做承诺，产出的是 G1 曲线点，数量随张量长度增加（每 n 个值一个点）。

## 八、一句话记住

**五种：藏起来（private）、贴公告栏（public）、焊进电路（fixed）、贴指纹（hashed）、贴封条（polycommit）。**

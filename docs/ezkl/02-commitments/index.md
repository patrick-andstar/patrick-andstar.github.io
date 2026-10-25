# 承诺与哈希

证明系统的骨架是三步：先封存（承诺）、再随机挑战、最后只打开一小块。承诺方案选错，后面全塌。

学完这一层，你应该能做到：**说清 KZG 那一行配对等式在验什么，以及 SRS 出问题会怎样。**

| 级别 | 知识点 | 一句话 |
|---|---|---|

### 哈希函数

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [哈希的三个安全目标](hash-functions/hash-security-goals.md) | 抗碰撞（找不到两个同哈希的输入）、单向（反推不出输入）、随机预言机（输出像真随机）。 |
| 支撑 | [SHA256与Keccak](hash-functions/sha256-keccak.md) | 工程里用它们校验 SRS 文件、算模型指纹；电路里几乎不用，因为每一位都要几百条约束。 |
| 核心 | [Poseidon与zk友好哈希](hash-functions/poseidon.md) | 专为电路设计的哈希：只用加法和 5 次幂，一位的约束数比 SHA256 少一到两个数量级。 |
| 核心 | [Fiat-Shamir与transcript](hash-functions/fiat-shamir-transcript.md) | 挑战值 = 哈希(此前收到的所有消息)。消息的顺序就是 transcript，顺序错了安全性就没了。 |

### 承诺方案

| 级别 | 知识点 | 一句话 |
|---|---|---|
| 核心 | [承诺的隐藏与绑定性](commitment-schemes/commitment-hiding-binding.md) | 先封存、后打开：封着时看不出内容（隐藏），打开时不能换成别的内容（绑定）。两者必须同时成立。 |
| 支撑 | [哈希承诺与Merkle树](commitment-schemes/hash-commitment-merkle.md) | 最朴素的承诺：把数据哈希一下公布。想证明「某一个元素在里面」，就得靠 Merkle 路径。 |
| 核心 | [KZG多项式承诺](commitment-schemes/kzg-commitment.md) | 用一个 32 字节的 G1 点代表整个多项式；想验「p(z)=v」，只需一次配对校验。 |
| 核心 | [可信设置与SRS](commitment-schemes/trusted-setup-srs.md) | KZG 需要一组「谁都不知道 τ」的公共参数 [τ^i·G]；SRS 文件就是它的序列化，大小是 2^k 个点。 |
| 支撑 | [批量打开与多开点](commitment-schemes/batch-opening.md) | 一次证明要对几十个多项式、在好几个点上开值；不批量合并，proof 会大到不可用。 |

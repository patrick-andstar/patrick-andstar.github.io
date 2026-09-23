# AI 智能体安全 · Chen25 精读笔记

!!! info "论文信息"
    **论文**：A Survey on the Safety and Security Threats of Computer-Using Agents: JARVIS or Ultron?  
    **一句话定位**：CUA 安全的四件套：统一定义 + 内外二分威胁 + 防御分类学 + 基准合成 —— 但**多模态只停在定义层**  
    **arXiv**：2505.10924  
    **精读日期**：2026-09-20

!!! note "产出说明"
    说明：本笔记数据源为损坏的 `.struct`（仅 PAGE1+标题+参考文献），已改用原始 PDF 经 PyMuPDF 按页重建全文（35 页，页号与 PDF 一致），并用文本层核验了符号类表格。所有实质论断均挂 PDF 页码（如 `(p.3)`）。

---

## 0. 30 秒速览（≤200 字）
Chen25 是一篇被 ACL 2026 接收的 SoK 型综述，聚焦 **CUA（Computer-Using Agent，直接操作图形界面完成任务的智能体）** 的安全威胁。它给出 CUA 的统一定义（把多模态感知当作 CUA 的本质特征），把威胁拆成 **8 类内在威胁 + 8 类外在攻击**，把防御拆成 **14 类策略**并做威胁–防御映射，最后汇总评测基准/数据集/指标。核心贡献是"统一定义 + 内/外二分威胁 + 防御分类学 + 基准合成"四件套。量化上：从 700+ 候选中筛出 **124 篇**深入分析的论文，引用约 **136 篇**。最大软肋：纯综述、无实验、无公开仓库，且**多模态只被当作 CUA 的定义特征和复杂性来源，未升格为独立攻击面**。

---

| 值 | 标签 | 说明 |
| --- | --- | --- |
| ACL 2026 | 正式收录 | 本批 10 篇里仅两篇拿到顶会背书，这是其一 |
| 700+ → 124 | 文献筛选 | 从 700+ 候选中筛出 124 篇做深入分析 |
| 8 + 8 | 内在威胁 + 外在攻击 | 威胁二分法：源自智能体自身 vs 由外部实体发起 |
| 14 类 | 防御策略 | 并做了威胁–防御映射；另汇总评测基准与指标 |
| 1 个 | 以多模态为核心的攻击 | Reasoning Gap Attack —— 全篇唯一一个 |


## 1. 识别与核实
| 项                      | 内容                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 题名（arXiv 元数据显示）        | A Survey on the Safety and Security Threats of Computer-Using Agents: **JARVIS or Ultron?**（冒号后置设问）                                                                            |
| 题名（arXiv v4 渲染 PDF 首页） | **JARVIS or Ultron?** 先行，副标题 "A Survey on the Safety and Security Threats of Computer-Using Agents"（设问提前）                                                                      |
| 题名（ACL 2026 会议版，据任务书）  | JARVIS or Ultron? A Survey on the Safety and Security Threats of Computer-Using Agents（设问提前）                                                                                   |
| ⚠️ 两版差异核实结论            | **任务书所言"会议版设问提前 / arXiv 版冒号后置"在 v4 渲染 PDF 上不成立**：v4 PDF 首页实际已是"JARVIS or Ultron?" 领起（与会议版语序一致）。即 arXiv 的*元数据/ID 标题字段*是冒号后置形式，而*渲染版*v4 已采用设问提前。引用时两种写法都合法，但需说明你指的是元数据还是 PDF 首页。 |
| 作者                     | Ada Chen (CMU)、Yongjiang Wu / Junyuan Zhang / Jingyu Xiao (CUHK，三人等贡献†)、Shu Yang (KAUST)、Jen-tse Huang (JHU)、Kun Wang (NTU)、Wenxuan Wang (人大，通讯‡)、Shuai Wang (HKUST)。共 9 人     |
| 年份 / 出处                | 2025-05 首发；arXiv:2505.10924v4 [cs.CL] 29 Apr 2026；**已获 ACL 2026 正式接收**（Crossref 确认）                                                                                            |
| DOI                    | 未核实（arXiv  preprint，无期刊 DOI；ACL 版 DOI 待查）                                                                                                                                      |
| 页数                     | **35 页**（PyMuPDF 确认）                                                                                                                                                           |
| 图数                     | **1 张**（Figure 1：CUA 威胁与防御总览分类树，位于文末 p.35）                                                                                                                                     |
| 表数                     | **6 张**（表1 内在威胁 / 表2 外在攻击 / 表3 防御策略 / 表4 与既往综述对比 / 表5 Web+Mobile 基准 / 表6 通用基准）                                                                                                 |
| 引用数                    | **约 136 篇**（脚本识别含显式年份条目 136；其中 arXiv  preprint 89、Preprint 17，其余为会议/期刊）。正文明确：从 700+ 候选中筛出 **124 篇**做深入分析                                                                       |
| 参考文献条数                 | 约 136 条（见上）                                                                                                                                                                    |
| 是否开源                   | **未核实到代码仓库**（纯综述，未声明 release 代码/数据；正文 Limitations 自承仅做架构与方法论分析，无实证评估）                                                                                                          |

---

## 2. 这篇是什么
- **定位**：SoK（Systematization of Knowledge）型安全综述，不是提出新方法的论文，也不是实证论文。
- **判断依据**：
  - 明确"present a systematization of knowledge"（p.1 摘要）；
  - 四个研究目标即 SoK 标准动作：定义 → 威胁分类 → 防御分类 → 基准/指标汇总（p.1、p.2）；
  - 用系统性文献综述流程（数据库选择 → 关键词检索 → 筛选过滤），自报 700+→124 篇（p.3）；
  - 全文无实验章节、无自有 ASR/准确率数字，结论段自承"our adaptive taxonomy … are general enough to incorporate new techniques"（p.10）属框架性贡献。
- **单一形态深挖**：只覆盖 **CUA 一种智能体形态**（OS / GUI / Web / 设备控制 Agent 都算 CUA 子类），不覆盖纯 API/工具 Agent、具身 Agent 等其他形态（p.2 定义圈定 GUI 交互）。

---

## 3. 结构与阅读地图
| 章 | 一句话 | 标注 |
|---|---|---|
| 1 Introduction | 抛出 CUA 的安全风险与四目标，点出 Figure 1 | 必读 |
| 2 Background（2.1 CUA 定义+框架；2.2 文献综述方法） | 给 CUA 定义、四大子类、感知/大脑/动作三件套；交代 700+→124 流程 | 必读 |
| 3 Taxonomy of Safety Threats（3.1 总览；3.2 内在 8 类；3.3 外在 8 类） | 内/外二分威胁，表1/表2 | 必读 |
| 4 Taxonomy of Existing Defenses（14 类，表3） | 防御分类 + 威胁–防御映射 | 必读 |
| 5 Evaluation and Benchmarking（数据集/指标/测量法，表5/6） | Web/Mobile/通用三类基准 + 13 个指标 + 三类测法 | 必读 |
| 6 Discussion（6.1 关键洞察；6.2 未来方向） | 多模态/实时、接地鸿沟、实验场景受限、透明性缺口 | 必读 |
| 7 Conclusion | 四点优先事项收束 | 可跳（与 6 重复） |
| Limitations + Ethical Statement | 自承无实证、偏英文公开源、可能漏新工作 | 必读（软肋） |
| References（p.10–16，约136条） | — | 可跳 |
| Appendix A Related Works + Table 4 | 与 9+ 篇综述对比，自称独特点 | 必读（定位用） |
| Appendix B 威胁详述（B.1 内在 / B.2 外在，含 Reasoning Gap 实例） | 每类威胁给例子；多模态最深处在此 | 必读（多模态） |
| Appendix C 防御详述 | 每类防御给实例 | 可跳 |
| Appendix D 基准详述（D.1/D.2，表5/6） | 各基准数据量/指标/测法 | 可跳（已摘要点） |
| Figure 1（文末） | 总览分类树（唯一图） | 建议回 PDF 看 |

---

## 4. 论文自己的框架
**四个研究目标（RO）如何落地**（p.1–2）：
- RO1 定义适合安全分析的 CUA；
- RO2 分类 CUA 当前安全威胁；
- RO3 提出防御策略完整分类学；
- RO4 汇总基准/数据集/指标。

**CUA 定义（RO1，p.2）**：
> "a Computer-Using Agent (CUA) is an LLM-based system that combines **multimodal perception**, advanced reasoning, and tool-use capabilities to perceive and interact with graphical user interfaces (GUIs) and external applications just like human users."

- 四大子类：OS Agents / GUI Agents / Web Agents / Device-control Agents（p.2）。
- 三件套框架（沿用 Xi et al. 2023）：**Perception（感知：截图/日志/用户输入）→ Brain（决策：记忆+规划）→ Action（执行：点击/输入/调工具）**（p.2）。后文所有威胁/防御都映射到这三件套。

**威胁分类（RO2，p.3）**—— 内/外二分：
- **Intrinsic（内在）8 类**：源于 Agent 自身（训练/配置/固有局限）。
- **Extrinsic（外在）8 类**：由外部 adversary/用户发起。
- 每个威胁刻画三维度：**来源**（Env/Prompt/Model/User，分主♦次♢）、**受影响组件**（Perception/Brain/Action，✓ 表示受影响）、**威胁模型**（恶意 attacker / 恶意 user / Agent 开发部署阶段）。

**防御分类（RO3，p.5–7）**—— 14 类，同样按 目标组件 / 框架组件 / 目标威胁 三轴组织，并做**威胁–防御映射**（如 Ex.2=Prompt Injection、In.3=Misalignment）。

**评测合成（RO4，p.7–9）**：按平台分 Web/Mobile/通用；13 个指标；三类测量法（Rule / LLM-as-judge / Manual）。

---

## 5. 攻击面
### 5.1 内在威胁（Intrinsic，8 类，表1，p.3–4）
| # | 威胁 | 一句话 | 受影响组件 | 阶段 |
|---|---|---|---|---|
| 1 | UI Understanding & Grounding Difficulties | 看不懂/接不上 UI 元素语义（静态数据集、分辨率、交互多样不足） | Perception | 开发 |
| 2 | Scheduling Errors | 动作顺序/并发/时序规划错 | Brain | 开发 |
| 3 | Misalignment | 推理与真实语境/用户意图不对齐 | Brain | 部署 |
| 4 | Hallucination | 生成无环境依据的假动作/API 调用 | Brain | 部署 |
| 5 | Excessive Context Length | 累积输入超模型容量致退化 | Brain | 架构 |
| 6 | Social and Cultural Concerns | 不识别社会规范/文化敏感 | Brain | 训练 |
| 7 | Response Latency | 推理/上下文导致延迟（金融/医疗高危） | Perception+Brain(+Action) | 部署/架构 |
| 8 | API Call Errors | 参数推断/填充错 | Action | 部署 |

### 5.2 外在攻击（Extrinsic，8 类，表2，p.4–5）
| # | 攻击 | 一句话 | 来源主因 | 威胁模型 |
|---|---|---|---|---|
| 1 | Adversarial Attack | 篡改输入/环境诱导有害行为（环境相关对抗样本） | Env(+Model♢) | 恶意 attacker |
| 2 | Prompt Injection | 在输入/环境嵌指令绕过安全（分 Direct / Indirect） | Env+Prompt | 恶意 attacker |
| 3 | Jailbreak Attack | 改写查询/注入指令绕过护栏 | Prompt | 恶意 attacker |
| 4 | Memory Attack | 污染/抽取持久记忆（Memory Extraction / Injection） | Prompt+Model | 恶意 attacker |
| 5 | Backdoor Attack | 训练/微调埋触发器，遇触发执行恶意行为 | Model | 恶意 attacker |
| 6 | **Reasoning Gap Attack** | **利用多模态感知与推理的不匹配，注入跨模态冲突信号** | Model | 恶意 attacker |
| 7 | System Sabotage | 诱使破坏文件/内存/进程（如 fork bomb） | Model | 恶意 attacker |
| 8 | Web Hacking | 把 CUA 变成自动化攻站工具（SQLi/XSS/弱口令） | Model | 恶意 user |

### 5.3 威胁模型与代表实例（带页码）
- 内在「接地」以数据集局限为核心因（Chen et al. 2025c GUI-World、Pahuja 2025、Nong 2024 MobileFlow）(p.4)。
- 外在 Prompt Injection 分 Direct（Debenedetti 2024 AgentDojo）与 Indirect（网页 Xu 2024、文件 Liao 2024、Web WASP Evtimov 2025、VPI-Bench Cao 2025）(p.4–5)。
- **Reasoning Gap（多模态最深处）**：Chen et al. 2025d（AEIA-MN）在**多模态移动 Agent** 上用"图像细微差异+误导文本"制造跨模态冲突，使推理误判(p.5, p.24)。
- System Sabotage 实例：fork bomb 伪装成"压力测试"(Luo 2025b Agrail)(p.24)。
- Web Hacking：Fang 2024b「LLM Agents Can Autonomously Hack Websites」(p.24)。
- 对抗图像补丁：Aichberger 2025「Attacking multimodal OS agents with malicious image patches」(p.11 参考文献)。
- 单图越狱多模态 Agent：Gu 2024「Agent Smith: A single image can jailbreak one million multimodal LLM agents」(p.12)。
- 环境干扰：Ma 2024「Caution for the environment: Multimodal agents are susceptible to environmental distractions」(p.12)。

---

## 6. 防御面
### 6.1 14 类防御（表3，p.5–7）
| # | 防御 | 一句话 | 主要目标威胁 |
|---|---|---|---|
| 1 | Environmental Constraints | 沙箱/限制环境交互 | Ex.2 Prompt Injection |
| 2 | Input Validation | 校验净化用户输入 | Ex.3 Jailbreak |
| 3 | Defensive Prompting | 结构化提示防操控 | Ex.1/2 |
| 4 | Data Sanitization | 清洗训练数据 | Ex.4/5 |
| 5 | Adversarial Training | 对抗样本增韧 | Ex.1 |
| 6 | Output Monitoring | 持续监看输出对齐意图 | In.3/4, Ex.7/8 |
| 7 | Model Inspection | 异常检测 + 权重分析查后门 | Ex.2/4/5 |
| 8 | Cross-Verification | 多 Agent 互验 | Ex.1/3/5 |
| 9 | Continuous Learning | 自进化 + 用户反馈 | Ex.2 |
| 10 | Transparentize | XAI + 审计日志 | In.3/4 |
| 11 | Topology-Guided | 多 Agent 拓扑流分析/剪边 | Ex.2 |
| 12 | **Perception Algorithms Synergy** | **融合互补感知模块得更稳 UI 表征（多模态相关）** | In.1/5 |
| 13 | Planning-Centric Architecture Refinement | 改架构保调度/延迟/API 正确 | In.2/7/8, Ex.6 |
| 14 | Pre-defined Regulatory Compliance | 合规/伦理内化 | In.3/4/6 |

### 6.2 论文承认的缺口（明确写）
- **无实证**："we focus on architectural and methodological analysis without empirically evaluating the relative effectiveness of different threats or defenses"（p.10 Limitations）。
- **覆盖偏差**：偏英文、公开源，可能漏专有/非英文研究与新兴攻击（p.10）。
- **威胁–防御映射粗糙**：多数防御只松映射 1–数个威胁，未给适用边界/优先级（表3 可见大量 "Ex. 2" 泛化）。
- 讨论章点出：**实时多模态**、**接地/感知鸿沟**、**实验场景受限**、**透明性赤字**四大开放问题（p.9）。

---

## 7. 表格/图还原
- **符号类表格核验结论**：表1/2/3/4 使用 ♦（主/完全覆盖）、♢（次/局部）、✓（受影响/具备）三类符号。经 PyMuPDF 文本层抽取，**这些符号已作为 Unicode 字符（♦ U+2666 / ♢ U+2662 / ✓ U+2713）直接保留在文本层**，并未丢失。按任务书第 3 条处置原则——文本层已保留即无需硬套矢量扫描，故未运行 pdf-table-marks 矢量还原（避免 0 标记误判）。
- ⚠️ **2 栏排版对齐 caveat**：本文为双栏 ACL 排版，纯文本抽取会把表头列（Env/Prompt/Model/User/Perception/Brain/Action）与单元格符号交错，个别单元格的"列归属"在文本流中易错位。本笔记表1/2/3 已按抽取顺序还原，但**精确单元格符号归属建议回 PDF 逐格核对**（尤其威胁4 Hallucination 的 ♢/♦ 先后）。
- **图**：全文仅 **Figure 1**（p.35 文末）一张，为 CUA 威胁与防御总览分类树。本文**无专门的多模态输入流程图/攻击流图**——这一点本身值得记：虽以多模态 GUI Agent 为载体，却未用可视化手段解剖多模态攻击链路。
- 表5/表6 为基准清单（平台/基准名/亮点/数据量/采集/指标/测法），无勾叉符号，纯文本已完整保留（见第 5 节与附录摘要点）。

---

## 8. 深案（Case Study / 实测）
**无**。本文是纯文献综述：没有作者自己跑的攻击/防御实验，没有 case study 实证，所有实例均为**引用他人工作的二手复述**（如 fork bomb 引 Luo 2025b、AEIA-MN 引 Chen 2025d）。结论段与 Limitations 均明确无实证评估（p.10）。

---

## 9. 论文自己承认的缺口与未来方向（逐条）
**Limitations（p.10）**：
1. 领域演进快，可能漏新兴攻击/防御/基准；
2. 主要基于英文公开源，可能低估专有/非英文研究；
3. 仅架构与方法论分析，**未实证比较**各威胁/防御的相对有效性。

**Future Directions（p.9–10，四点优先事项）**：
1. **Real-time, realistic benchmarking**——更动态、含领域专长的真实基准；
2. **Integrated, efficient defenses**——如何高效智能地组合不同防御机制；
3. **Scalable transparency and audits**——实时策略执行与可审计；
4. **Human-in-the-loop safeguards**——实时人工监督、风险预警、可解释理由。

**Discussion 关键洞察（p.9）**：实时多模态强调、接地/感知鸿沟（多模态幻觉）、实验场景受限、透明性赤字。

---

## 10. 我的自读软肋
**① 论文的问题（批判性）**：
- 分类学"内/外二分 + 来源三轴"带主观性：♦/♢ 主因判定无形式化判据，更像编者标签。
- **多模态未被升格为独立攻击面**：虽把多模态写进 CUA 定义，但威胁分类里没有"多模态攻击"这一维；跨模态冲突只落在 Reasoning Gap 一类，视觉提示注入/对抗补丁/环境干扰散落各攻击示例却未系统化（详见②）。
- 防御分类 14 类与威胁 16 类之间映射稀疏、缺优先级与适用条件，落地指导性弱。
- 无实验 → 无法判断哪些防御真正有效、哪些威胁最危险（ASR 全为引用他人）。

**② 我没读透/没核到的地方**：
- 表1/2/3 的**逐格符号–列对齐**仅按文本流还原，未逐格回 PDF 核验（双栏易错位）。
- Figure 1 仅看文字标题，未逐枝核对分类树图形细节（建议回 PDF 看图）。
- **多模态覆盖深度（本次最关键核点）结论**：
  Chen25 对"多模态输入"的处理是**「把多模态当 CUA 的本质特征 + 复杂性来源，而非独立攻击面」**。具体落点：(a) 定义层把 multimodal perception 列为 CUA 三要素之一(p.2)；(b) 内在威胁的 UI Grounding / Hallucination 隐含多模态感知；(c) 外在攻击中**唯一以多模态为核心的只有 Reasoning Gap Attack**——"exploits mismatches between a CUA's multimodal perception and its internal reasoning, injecting conflicting or ambiguous signals into one or more modalities"(p.5)，附录 B.2 给 AEIA-MN 跨模态（图+文）冲突实例(p.24)；(d) 防御侧只有 Perception Algorithms Synergy（#12）沾多模态，且描述泛化(p.7)；(e) 讨论章把"多模态 grounding / 多模态幻觉"列为关键洞察但停在描述层(p.9)；(f) 基准按平台而非模态组织，多模态基准（VWA-Adv、VPI-Bench、GUI-World）只是 Web/Mobile 类里的若干条。
  **结论：多模态在 Chen25 里是一条"线索"而非"支柱"——有专门攻击（Reasoning Gap）和专门防御（Perception Synergy）的入口，但缺少多模态攻击技术的系统分类（视觉注入 vs 对抗补丁 vs 跨模态冲突未分层）、缺多模态专属基准维度、缺多模态攻击流图。对比同批 Kim26/Dan26 多模态近乎为零，Chen25 是批次里多模态意识最强的一篇，但"挖深"程度仍有限，停在描述与举例层。**

---

## 11. 文献定位（与同批 9 篇的关系）
- **本篇在批次中的独特站位**：唯一以 **CUA / GUI 多模态 Agent** 为唯一载体的安全综述；是把"智能体安全"与"多模态大模型安全"两条线真正接起来的桥接论文。
- **与 TrustAgent 2503.09648（骨架型）**：Chen25 在参考文献中明确引用 TrustAgent（Hua et al., EMNLP 2024，p.12），并自评差异——TrustAgent 偏"把安全规则编入规划/评测"，Chen25 偏"CUA 专属威胁–防御–基准统一框架"（Table 4 中 TrustAgent 未列，因属能力/评测向而非纯安全分类）。
- **与 Kim26 2603.11088（USENIX Security 2026，multimodal=0）**：Chen25 引用 Kim et al. 2026（p.13）并在 Table 4 对比——Kim26 有 Safety Focus + Defense Taxonomy + Benchmark，但**无 Unified Scope(web/mobile/desktop) 与明确 Threat-source split**；最关键：Kim26 多模态覆盖≈0，Chen25 以多模态为定义核心，正好是 Kim26 的互补面。
- **与 Deh26 2603.22928（攻击面 SoK）**：Deh26 攻"攻击面"维度，Chen25 已含完整攻击面（16 类）+ 防御面，覆盖更广但攻击面挖掘不一定比 Deh26 深。
- **与 Ferrag25 2506.23260（攻击链/ICT Express）**：Chen25 引用 Ferrag et al. 2025（p.12，"From prompt injections to protocol exploits"）并在威胁/防御多处引用；Ferrag 偏"攻击链/协议利用"叙事，Chen25 偏分类学，可互为参照。
- **与 Ma25 2502.05206（Safety at Scale）**：Chen25 引用 Ma et al. 2025（p.12/13，Table 4 列为对比项，有 Safety Focus + Benchmark 但缺 Defense Taxonomy 与 Threat-defense mapping）。
- **与 Wang25 2504.15585（全栈安全）、Kong25 2506.19676（通信协议）、Su25 2506.23844（自主性/CMDP）、Dan26 2608.14590（规格-验证-执行）**：Chen25 未直接覆盖通信协议/CMDP/形式化验证这些专项；Dan26 多模态≈0，与 Chen25 形成"形式化保障 vs 多模态实务"互补。
- **一句话**：Chen25 = 批次内「多模态 + GUI 实务」担当；Kim26/Dan26 = 「广域 agentic + 形式化」担当（多模态空）；TrustAgent = 骨架/评测；Ferrag/Deh = 攻击链/攻击面专项。

---

## 12. 切口分级
- 🟢 **GUI / 浏览器智能体安全实证复现**：理由——Chen25 汇总了大量现成基线（VPI-Bench 306 例、RedTeamCUA 216 场景、WASP 84 任务、OS-Harm 150 任务、AgentHazard 2653 实例、AgentDojo 等），可直接拿来跑实验；Chen25 自己承认"无实证"，正好留出空白。做得出来：选 2–3 个 GUI 基准，复现并对比防御（如 Input Validation vs Output Monitoring）的 ASR。
- 🟢 **防御分类学的「缺口/冗余」分析**：理由——表3 映射稀疏且自评"如何高效组合防御未解"（p.9），可基于 14 类防御做系统性 gap 分析，无需新实验。
- 🟡 **多模态专属攻击面分类学（扩展 Chen25）**：理由——Chen25 把多模态只当线索，未分层（视觉注入/对抗补丁/跨模态冲突/环境干扰）。需缩范围：只做"GUI Agent 多模态攻击技术 taxonomy + 基准映射"，避免泛化成全模态综述。做得出来，但需自己定边界。
- 🟡 **Reasoning Gap Attack 的深入机制/防御**：理由——Chen25 只给 AEIA-MN 一个例子（p.24），机制与防御都浅；可针对"跨模态冲突"做受控实验。需缩：限定在图像+文本双模态 GUI 场景。
- 🔴 **统一形式化威胁模型（带语义）**：理由——Chen25 分类全为描述性、♦/♢ 无形式判据；要建形式化模型支撑太薄，需大量前置工作，不建议直接以本文为唯一支点。
- 🔴 **跨形态（CUA+API+具身）统一安全框架**：理由——Chen25 明确只覆盖 CUA 一种形态，扩到跨形态缺材料。

**切口结论**：最值得做且最贴合你课题（AI 智能体安全 + 多模态）的是 **🟡「GUI/浏览器智能体上的多模态攻击面 taxonomy + 实证」**——它补上 Chen25 留白（多模态未升格 + 无实验），又有 Kim26/Dan26 都不具备的多模态抓手；若想最快出结果，先做 🟢 GUI 智能体安全复现（基线齐全）。

---

## 13. 可直接引用的原话
1. **(p.2, 定义/多模态本质)** "a Computer-Using Agent (CUA) is an LLM-based system that combines multimodal perception, advanced reasoning, and tool-use capabilities to perceive and interact with graphical user interfaces (GUIs) and external applications just like human users." —— 支撑：CUA 定义把多模态列为本质特征。
2. **(p.3, 内/外二分)** "Intrinsic threats arise from intrinsic aspects of the agent itself … Extrinsic threats … are initiated by external entities, such as malicious attackers or users." —— 支撑：威胁二分法。
3. **(p.3, 文献规模)** "we identified 700+ papers potentially addressing security concerns related to CUAs … resulting in 124 pertinent papers for in-depth analysis." —— 支撑：综述覆盖广度量化。
4. **(p.5, 多模态最深处)** "Reasoning Gap Attack exploits mismatches between a CUA's multimodal perception and its internal reasoning, injecting conflicting or ambiguous signals into one or more modalities that cause the agent to draw incorrect inferences." —— 支撑：唯一以多模态为核心的攻击。
5. **(p.9, 多模态洞察)** "CUAs respond in dynamic, GUI-driven environments, which impose stringent requirements on low-latency reasoning, multimodal grounding, and on-device resource use." —— 支撑：多模态/实时是关键开放问题。
6. **(p.10, 自承无实证)** "we focus on architectural and methodological analysis without empirically evaluating the relative effectiveness of different threats or defenses." —— 支撑：本文最大软肋。
7. **(p.10, 结论/框架通用性)** "our adaptive taxonomy and comprehensive threat–defense framework are general enough to incorporate new techniques, offering a robust foundation for securing next-generation CUAs." —— 支撑：框架型贡献定位。
8. **(p.10, 未来四点)** "Future efforts should prioritize: (i) real-time, realistic benchmarking, (ii) integrated, efficient defenses, (iii) scalable transparency and audits, and (iv) human-in-the-loop safeguards." —— 支撑：未来方向清单。

---

### 附：关键量化一览（硬数字）
- 页数 **35**；图 **1**（Figure 1）；表 **6**（1–6）；参考文献 **≈136**（arXiv 89 + Preprint 17 + 其余）。
- 文献筛选：**700+ → 124** 篇深入分析（2022 起）。
- 威胁：**8 内在 + 8 外在 = 16**；防御：**14**；评测指标：**13**；测量法：**3 类**（Rule / LLM-judge / Manual）。
- 基准清单：表5 **11 个**（Web 9 + Mobile 2）、表6 **18 个**通用，合计 **≈29** 个（含 AgentHarm 110 恶意任务、AgentHazard 2653 实例、GUI-Robust 5318 任务、InjecAgent 1054 例等）。
- **本篇零自有 ASR/准确率**：所有量化指标均为引用他人基准，作者未跑任何实验。

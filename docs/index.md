# wjc-wiki

> 自用复习知识库。三个板块：**求职** · **算法竞赛** · **论文精读**。
> 站内搜索 · 页内目录 · 代码复制 · 公式 · 图表。

<div class="grid cards" markdown>

-   :material-briefcase-outline:{ .lg .middle } **求职**

    ---

    Agent 开发 · AI 应用开发 · 全栈开发 · Java 后端八股

    [:octicons-arrow-right-24: 进入](job/index.md)

-   :material-sitemap-outline:{ .lg .middle } **算法竞赛**

    ---

    基础算法 · 递归与搜索 · 图论 · 动态规划 · 贪心 · 模拟 · 数据结构

    [:octicons-arrow-right-24: 进入](algorithm/index.md)

-   :material-flask-outline:{ .lg .middle } **论文精读**

    ---

    AI 智能体安全 · 多模态大模型安全

    [:octicons-arrow-right-24: 进入](research/index.md)

</div>

## 站点约定

- **定位**：自用复习库。组会材料、核实台账、自我批评这类内部内容可以直接放。
- **目录与文件名用英文 slug，标题用中文写**：URL 干净、链接稳定，中文只出现在标题与导航里。
- **一页一主题**：一页只讲一件事，太长就拆。

## 维护

- 仓库：[patrick-andstar/patrick-andstar.github.io](https://github.com/patrick-andstar/patrick-andstar.github.io)
- 推送 `main` 后由 GitHub Actions 构建部署；`mkdocs build --strict` 失败即不发布。
- 每个目录下的 `.pages` 文件控制导航顺序与中文节名。列表末尾的 `...` 表示「未被点名的其余文件，按名称排序自动追加」，
  所以在任意目录里新丢一个 md 就会自动出现在该节末尾，**不需要改 `.pages`**；想让某篇排到前面，才需要手动加一行。

# wjc-wiki

个人技术书学习笔记站点（MkDocs Material，GitHub Pages）。

## 目录约定

- `docs/index.md` — 图书馆首页
- `docs/books/<英文slug>/` — 每本书一个子目录（`00-目录.md` 为入口）
- `docs/assets/` — 样式与静态资源（MathJax/Mermaid 本地文件放在 `assets/vendor/`）

## 发布流程（两步发布）

1. push 到 `main` → Actions 自动构建并生成预览 artifact（zip）；
2. 仓库 Settings → Environments → github-pages 添加自己为 Required reviewer；
3. 每次 push 后，进入 Actions 页面人工批准 deploy job 才真正发布。

## 新增一本书

1. 本地知识库完成 OCR + AI 整理 + 覆盖率核对；
2. 用转换脚本生成 `docs/books/<slug>/`；
3. 在 `mkdocs.yml` 的 nav 加一行；
4. commit & push。

# 项目交接文档 · AI 精读笔记平台

> 本文档的目标读者是**接手的 AI Agent 或新开发者**。读完本文档 + 引用的子文档后，你应该能独立完成：添加新书、修 bug、部署上线。

---

## 1. 项目概览

### 1.1 这是什么

一个面向中文用户的**海外投资书籍 AI 精读笔记平台**。把投资经典书籍（epub）转化为中文精读笔记网页，每章一个折叠卡片，包含核心概念解读、金句、文化背景、中国市场关联等。

### 1.2 核心原则

- **用户是零英文基础的中文读者**——所有可见文字必须中文化，只保留 ROE/EPS/PE/DCF 等纯缩写
- **内容深度 > 内容广度**——每章都值得展开精读，不追求覆盖所有内容
- **纯静态，零后端**——HTML+CSS+JS，无需数据库、无需服务器

### 1.3 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 页面 | HTML5 + CSS3 | 共享 style.css，每个书籍页面独立 index.html |
| 交互 | Vanilla JS (IIFE) | app.js（核心）+ chat.js（AI对话） |
| 部署 | GitHub Pages | main 分支，自动部署 |
| 后端代理 | Cloudflare Worker | 转发 AI API 请求，隐藏 API Key |
| 测试 | Playwright (Python) | 截图验证，多视口检查 |
| epub 解析 | Python + BeautifulSoup | 一次性提取，不集成到页面 |

### 1.4 线上地址

- **首页**: https://ai-reading.workbuddy.com
- **仓库**: https://github.com/Leoshuaihao/ai-reading-notes
- **部署**: GitHub Pages（main 分支根目录）

---

## 2. 目录结构

```
ai-reading-notes/
├── index.html                          # 书架首页
├── diagnose.html                       # 股票诊断引擎（独立页面）
├── .gitignore                          # Git 忽略规则
│
├── ONBOARDING.md                       # 👈 你正在读的文档
├── ADD_BOOK_STANDARD.md                # 新书添加标准流程（六阶段）
├── DOC_CSS.md                          # CSS 架构说明
├── DOC_JS.md                           # JS 架构说明
├── DOC_I18N.md                         # 中文化规范
├── DOC_TEST_DEPLOY.md                  # 测试与部署
├── DEPLOY.md                           # 早期部署备忘（参考）
│
├── assets/
│   ├── css/
│   │   └── style.css                   # 全局样式（~440行，所有页面共享）
│   └── js/
│       ├── app.js                      # 核心交互逻辑
│       └── chat.js                     # AI 对话模块
│
├── books/                              # 每本书一个子目录
│   ├── fisher/index.html               # 怎样选择成长股（8章）
│   ├── howard-marks/index.html         # 投资最重要的事（21章）
│   ├── buffett/index.html              # 巴菲特之道（8章）
│   ├── alchemy-finance/index.html      # 金融炼金术（12章）
│   ├── market-cycle/index.html         # 周期（18章）
│   └── buffett-letters/index.html      # 巴菲特致股东信（13章）
│
├── engine/                             # 股票诊断引擎后端（Python/Flask）
│   ├── api.py                          # API 入口
│   ├── data_layer.py                   # 数据层
│   └── fisher_engine.py                # Fisher 15条原则引擎
│
├── worker/                             # Cloudflare Worker（API 代理）
│   └── src/index.js                    # Worker 入口
│
├── PRD_海外书籍AI精读平台_v1.md         # 产品需求文档
├── PRD_股票诊断引擎_v1.md               # 诊断引擎 PRD
├── 海外书籍AI精读平台_需求规划_v1.md     # 早期需求规划
├── 海外书籍AI精读平台_首期书单筛选.md    # 书单筛选逻辑
├── 精读笔记_内容结构设计.md             # 内容结构设计
├── 评审报告_v1.md                       # 早期评审报告
├── 研发任务拆解_v1.md                    # 研发任务拆解
├── 自有生态架构设计_v1.md               # 架构设计
├── 商业内嵌_需求调研_v1.md              # 商业内嵌调研
├── 嵌入点全景_v2.md                     # 嵌入点全景
│
└── epub_extracted/                     # epub 解压临时目录（已 gitignore）
```

---

## 3. 页面架构

### 3.1 书架首页 (`index.html`)

结构：Hero → 统计数字 → 诊断入口 Banner → 书籍卡片网格 → Footer

每本书一张 `.book-card`，内含封面、书名、作者、简介、标签、入口按钮。

### 3.2 书籍精读页 (`books/{slug}/index.html`)

固定结构（按顺序）：

```
1. <nav class="top-nav">          ← 导航栏（自动生成下拉菜单）
2. <section class="book-hero">    ← 书籍封面 + 元信息
3. <section> why-section          ← "为什么值得精读" 2×2 网格
4. <section class="author-bio">   ← 作者简介
5. 核心框架/原则速览（可选）       ← 取决于书的特色
6. <section> .roadmap             ← 阅读路线图
7. <div class="progress-section"> ← 阅读进度条
8. <article class="chapter-card"> ← 导言（data-no-collapse="true"）
9. <article class="chapter-card"> ← 第1章…第N章（自动折叠）
10. 诊断工具 CTA Banner
11. <footer>
12. <button class="back-to-top">  ← 回到顶部
13. <script> 引用 app.js + chat.js
```

### 3.3 诊断引擎 (`diagnose.html`)

独立的股票诊断页面，调用 `engine/` 后端或本地 JS 引擎，用投资大师的原则框架打分。

---

## 4. 快速上手：添加一本新书

完整流程见 [ADD_BOOK_STANDARD.md](./ADD_BOOK_STANDARD.md)，六阶段概要：

| 阶段 | 做什么 | 产出 |
|------|--------|------|
| 一 | 解压 epub → 提取 TOC → 确认版本 → 与用户对齐 | 确认清单 |
| 二 | 按模板生成 HTML（Hero → 章节 × N → Footer） | `books/{slug}/index.html` |
| 三 | 中文化检查（见 DOC_I18N.md） | 无英文残留 |
| 四 | 导航栏链接（自动生成下拉，无需手动） | — |
| 五 | 首页加卡片 + 更新统计 | `index.html` |
| 六 | git commit + push + 截图验证 | 线上可访问 |

---

## 5. 开发工作流

### 5.1 修改代码

```bash
# 克隆
git clone https://github.com/Leoshuaihao/ai-reading-notes.git
cd ai-reading-notes

# 修改文件后预览（本地）
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

### 5.2 截图验证

```bash
# 需要先安装: pip install playwright && playwright install chromium
python3 -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('file://' + '/绝对路径/index.html', wait_until='networkidle')
    page.screenshot(path='screenshot.png')
    browser.close()
"
```

### 5.3 部署

```bash
git add -A
git commit -m "描述修改内容"
git push origin main
# GitHub Pages 自动部署，等 1-2 分钟 CDN 刷新
```

---

## 6. 关键约束

### 6.1 不可修改

- `assets/css/style.css` 中的 CSS 变量名和组件类名——所有页面依赖它们
- `.top-nav` 的 HTML 结构——app.js 依赖它生成下拉菜单
- 章节链接格式 `#chN`——IntersectionObserver 依赖它追踪阅读进度

### 6.2 必须遵守

- 章节标题统一为 `第N章 · 标题` 格式
- 导航栏固定：概览 → 路线图 → 导言 → 章节
- 所有面向用户的文字必须中文化（详见 DOC_I18N.md）
- 封面设计用 CSS 渐变 + 文字，不用图片（减少加载）

### 6.3 常见陷阱

- **导航栏不显示下拉**：检查章节链接的 href 是否以 `#ch` 开头
- **章节折叠不工作**：检查是否有 `data-no-collapse="true"` 属性
- **中文化遗漏**：用 `grep -oP '[A-Za-z]{4,}' books/new-book/index.html` 检查
- **GitHub Pages 不更新**：等 1-2 分钟，或加 `?v=xxx` 参数强制刷新

---

## 7. 子文档索引

| 文档 | 内容 | 何时读 |
|------|------|--------|
| [ADD_BOOK_STANDARD.md](./ADD_BOOK_STANDARD.md) | 新书添加六阶段标准流程 | 添加新书前必读 |
| [DOC_CSS.md](./DOC_CSS.md) | CSS 变量、组件映射、响应式规则 | 修改样式前必读 |
| [DOC_JS.md](./DOC_JS.md) | JS 模块职责、交互逻辑、数据流 | 修改交互前必读 |
| [DOC_I18N.md](./DOC_I18N.md) | 中文化规则、保留项、检查脚本 | 内容生成后必读 |
| [DOC_TEST_DEPLOY.md](./DOC_TEST_DEPLOY.md) | Playwright 测试、GitHub Pages 部署 | 上线前必读 |
| [PRD_海外书籍AI精读平台_v1.md](./PRD_海外书籍AI精读平台_v1.md) | 产品需求文档 | 理解产品定位 |
| [PRD_股票诊断引擎_v1.md](./PRD_股票诊断引擎_v1.md) | 诊断引擎需求 | 修改诊断功能 |

---

## 8. 快速故障排查

| 症状 | 可能原因 | 解决 |
|------|---------|------|
| 页面空白 | CSS/JS 路径错误 | 检查 `../../assets/` 相对路径 |
| emoji 显示方块 | 系统缺字体 | `apt install fonts-noto-color-emoji` |
| 下拉菜单不显示 | 章节链接 href 不是 `#ch` 开头 | 检查 nav-links 中的 a 标签 |
| 侧边面板不出现 | app.js 加载失败 | 检查 script 标签引用 |
| 章节预览内容空 | 没有 "核心问题" 或 "一句话总结" 块 | 确保章节卡片有这两个 block |

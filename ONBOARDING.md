# 项目交接文档 · AI 精读笔记平台

> 本文档的目标读者是**接手的 AI Agent 或新开发者**。读完本文档 + 引用的子文档后，你应该能独立完成：添加新书、修 bug、部署上线。

---

## 1. 项目概览

### 1.1 这是什么

一个面向中文用户的**投资书籍 AI 精读笔记平台**，目前已进化到 V2 阶段。核心定位从"读书笔记网站"升级为**"投资学习体系平台"**——以五域修行为隐喻，将 16 本经典投资书籍组织成有结构的学习路径，配合等级系统、能力雷达图、概念地图、金句墙等游戏化机制。

### 1.2 当前规模（V2）

| 指标 | 数值 |
|------|------|
| 精读书籍 | 16 本 |
| 精读章节 | 278 章 |
| 覆盖大师 | 8+ 位（费雪、格雷厄姆、巴菲特、芒格、马克斯、林奇、塔勒布、利弗莫尔等） |
| 独立页面 | 6 个（修行首页、书架、概念地图、个人中心、诊断引擎、精读指南） |
| 修行域 | 5 个（商业认知、资产估值、周期市场、心性哲学、不确定性） |
| 等级体系 | 9 级（见习学徒 → 传奇宗师） |

### 1.3 核心原则

- **用户是零英文基础的中文读者**——所有可见文字必须中文化，只保留 ROE/EPS/PE/DCF 等纯缩写
- **体系化学习 > 碎片阅读**——16 本书不是孤岛，而是按五域体系组织的登山路径
- **游戏化激励 > 枯燥书单**——等级/成就/能力雷达让用户看见自己的成长
- **纯静态，零后端**——HTML+CSS+JS，无需数据库、无需服务器

### 1.4 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 页面 | HTML5 + CSS3 | 共享 style.css + 每页独立内联 `<style>` |
| 交互 | Vanilla JS (IIFE) | app.js（603行核心交互）+ chat.js（324行AI对话）+ 每页独立内联 `<script>` |
| 部署 | GitHub Pages | main 分支，自动部署 |
| 后端代理 | Cloudflare Worker | 转发 AI API 请求，隐藏 API Key |
| 测试 | Playwright (Python) | 截图验证，多视口检查 |
| epub 解析 | Python + BeautifulSoup | 一次性提取，不集成到页面 |

### 1.5 线上地址

- **首页**: https://leoshuaihao.github.io/ai-reading-notes
- **仓库**: https://github.com/Leoshuaihao/ai-reading-notes
- **部署**: GitHub Pages（main 分支根目录）

---

## 2. 目录结构

```
ai-reading-notes/
├── index.html                          # 🏠 修行首页（五域体系 + 能力雷达 + 金句墙）
├── bookshelf.html                      # 📚 完整书架（16本书卡片网格）
├── concepts.html                       # 🕸️ 概念地图（12个核心概念跨书索引）
├── my.html                             # 🧘 个人中心（等级/成就/能力树/登山可视化）
├── diagnose.html                       # 🔍 股票诊断引擎
├── .gitignore
│
├── ONBOARDING.md                       # 👈 你正在读的文档
├── ADD_BOOK_STANDARD.md                # 新书添加标准流程（需更新到 V2 架构）
├── DOC_CSS.md                          # CSS 架构说明
├── DOC_JS.md                           # JS 架构说明
├── DOC_I18N.md                         # 中文化规范
├── DOC_TEST_DEPLOY.md                  # 测试与部署
├── DEPLOY.md                           # 早期部署备忘（参考）
│
├── assets/
│   ├── css/
│   │   └── style.css                   # 全局样式（523行，所有页面共享）
│   └── js/
│       ├── app.js                      # 核心交互逻辑（603行）
│       └── chat.js                     # AI 对话模块（324行）
│
├── books/                              # 16本书，每本一个子目录
│   ├── fisher/                         # 怎样选择成长股（10章）Lv.2
│   ├── intelligent-investor/           # 聪明的投资者（23章）Lv.2
│   ├── security-analysis/              # 证券分析（19章）Lv.3
│   ├── buffett/                        # 巴菲特之道（9章）Lv.1
│   ├── buffett-letters/                # 巴菲特致股东的信（13章）Lv.3
│   ├── poor-charlie/                   # 穷查理宝典（13章）Lv.2
│   ├── howard-marks/                   # 投资最重要的事（22章）Lv.2
│   ├── market-cycle/                   # 周期（19章）Lv.3
│   ├── alchemy-finance/                # 金融炼金术（13章）Lv.3
│   ├── peter-lynch/                    # 彼得·林奇的成功投资（22章）Lv.1
│   ├── beating-street/                 # 战胜华尔街（15章）Lv.1
│   ├── economic-moat/                  # 巴菲特的护城河（15章）Lv.2
│   ├── stock-operator/                 # 股票大作手回忆录（25章）Lv.1
│   ├── fooled-by-randomness/           # 随机漫步的傻瓜（15章）Lv.3
│   ├── black-swan/                     # 黑天鹅（20章）Lv.3
│   └── antifragile/                    # 反脆弱（25章）Lv.4
│
├── engine/                             # 股票诊断引擎后端（Python/Flask）
│   ├── api.py
│   ├── data_layer.py
│   └── fisher_engine.py
│
├── worker/                             # Cloudflare Worker（API 代理）
│   └── src/index.js
│
├── PRD_海外书籍AI精读平台_v2.md         # V2 PRD（当前迭代规划）
├── PRD_股票诊断引擎_v1.md               # 诊断引擎 PRD
├── 自有生态架构设计_v1.md               # 架构设计
├── 嵌入点全景_v2.md                     # 嵌入点全景
├── 研发任务拆解_知识训练系统_v2.md       # 知识训练系统研发拆解（当前）
│
└── epub_extracted/                     # epub 解压临时目录（已 gitignore）
```

---

## 3. 页面架构

### 3.1 修行首页 (`index.html`) — 1201 行

**核心定位**：用户进入平台的第一站，展示完整的五域修行体系和能力画像。

```
结构：
├── <nav class="top-nav">              ← 导航：修行 | 股票诊断 | 概念地图 | 书架
├── <section class="practice-hero">    ← 暗色 Hero：等级徽章 + 迷你山 + SVG 金字塔
├── <section class="ability-section">  ← 能力雷达图（SVG 五维）+ 统计卡片
├── <div id="domainCards">             ← 五张域卡片（JS 动态渲染）
│   ├── 商业认知（彼得·林奇，4本书，Lv.1-Lv.2）
│   ├── 资产估值（格雷厄姆，4本书，Lv.1-Lv.3）
│   ├── 周期与市场（霍华德·马克斯，3本书，Lv.2-Lv.3）
│   ├── 心性与哲学（查理·芒格，2本书，Lv.1-Lv.2）
│   └── 不确定性与风险（塔勒布，3本书，Lv.3-Lv.4）
├── <section class="quote-wall">       ← 金句滚动墙（20条，6s轮播）
├── <section class="book-quiz">        ← 趣味测试："这本书是谁的菜？"
├── <section class="daily-read">       ← 今日精读（每日随机一章）
├── <section class="practice-summary"> ← 修行总览（统计 + XP 进度条）
└── <footer>
```

**关键数据流**：
- `BOOK_META`（16本书元数据）+ `DOMAINS`（5域定义）→ 静态配置
- `localStorage.reading_progress` + `localStorage.my_principles` → 用户数据
- `computeBookProgress()` → `computeDomainProgress()` → `computeXP()` → `computeLevel()` → 渲染全部

### 3.2 完整书架 (`bookshelf.html`) — 496 行

16 本书卡片网格，每张卡片含封面（CSS 渐变）、书名、作者、简介、标签、入口按钮。底部有诊断引擎 Banner。

### 3.3 概念地图 (`concepts.html`) — 571 行

12 个核心投资概念（内在价值、安全边际、护城河、能力圈、市场先生、风险、周期、黑天鹅、反脆弱、逆向投资、复利、成长股）× 4 个主题域（估值类、商业类、风险类、心性类），每个概念可折叠展开看不同大师的多维视角。

### 3.4 个人中心 (`my.html`) — 626 行

等级徽章、五座山 SVG 登山进度、XP 经验条、能力树（技能分支+解锁叶片）、成就徽章系统（15+枚）、16 本书阅读进度卡。

### 3.5 诊断引擎 (`diagnose.html`)

独立的股票诊断页面，用投资大师的原则框架打分。

### 3.6 书籍精读页 (`books/{slug}/index.html`)

固定结构（按顺序）：

```
1. <nav class="top-nav">          ← 导航栏（app.js 自动生成下拉菜单）
2. <section class="book-hero">    ← 书籍封面 + 元信息
3. <section> why-section          ← "为什么值得精读" 2×2 网格
4. <section class="author-bio">   ← 作者简介
5. 核心框架/原则速览（可选）       ← 取决于书的特色
6. <section> .roadmap             ← 阅读路线图
7. <div class="progress-section"> ← 阅读进度条
8. <article class="chapter-card"> ← 导言（data-no-collapse="true"）
9. <article class="chapter-card"> ← 第1章…第N章（自动折叠）
10. 跨书对话卡片 / 思考题自测卡片
11. <footer>
12. <button class="back-to-top">  ← 回到顶部
13. <script> 引用 app.js + chat.js
```

---

## 4. 五域修行体系

### 4.1 五座山

| 域 | 代表大师 | 核心问题 | 书籍 | 难度 |
|----|---------|---------|------|------|
| 🧭 商业认知 | 彼得·林奇 | 能不能识别好生意？ | 4 本 | Lv.1-Lv.2 |
| ⚖️ 资产估值 | 本杰明·格雷厄姆 | 这家公司值多少钱？ | 4 本 | Lv.1-Lv.3 |
| 🔄 周期与市场 | 霍华德·马克斯 | 市场现在处于什么位置？ | 3 本 | Lv.2-Lv.3 |
| 🧘 心性与哲学 | 查理·芒格 | 我怎么不被情绪干掉？ | 2 本 | Lv.1-Lv.2 |
| 🌪️ 不确定性与风险 | 纳西姆·塔勒布 | 我不知道的事如何伤害我？ | 3 本 | Lv.3-Lv.4 |

### 4.2 跨山连接

每张域卡片底部有"跨山连接"区域，展示其他山的书籍中与该域相关的章节。例如"资产估值"域推荐阅读《穷查理宝典》第2章"投资原则检查清单"。

### 4.3 XP 经验值公式

```
XP = 已读章节数 × 1 + 收藏原则数 × 2 + 已完成书籍数 × 5 + 已开启域数 × 2
```

### 4.4 等级体系

| 等级 | 称号 | XP 需求 |
|------|------|---------|
| Lv.1 | 🌱 见习学徒 | 0 |
| Lv.2 | 🥾 初级行者 | 10 |
| Lv.3 | 🧗 中级行者 | 30 |
| Lv.4 | 🏔️ 高阶行者 | 60 |
| Lv.5 | 🔮 见习智者 | 100 |
| Lv.6 | 🧙 贤者 | 160 |
| Lv.7 | 👑 大贤者 | 240 |
| Lv.8 | 💎 宗师 | 340 |
| Lv.9 | ⭐ 传奇宗师 | 460 |

---

## 5. 快速上手：添加一本新书

完整流程见 [ADD_BOOK_STANDARD.md](./ADD_BOOK_STANDARD.md)，V2 新增步骤概要：

| 阶段 | 做什么 | 产出 |
|------|--------|------|
| 一 | 解压 epub → 提取 TOC → 确认版本 → 与用户对齐 | 确认清单 |
| 二 | 按模板生成 HTML（Hero → 章节 × N → Footer + 思考题自测 + 跨书对话） | `books/{slug}/index.html` |
| 三 | 中文化检查（见 DOC_I18N.md） | 无英文残留 |
| 四 | 导航栏链接（自动生成下拉，无需手动） | — |
| 五 | **更新 index.html 中的 BOOK_META + DOMAINS 配置** | 修行首页显示新书 |
| 六 | **更新 bookshelf.html 中的书籍卡片** | 书架页显示新书 |
| 七 | git commit + push + 截图验证 | 线上可访问 |

> ⚠️ V2 关键变化：新书不只是加一个 HTML 文件，还需要在 index.html 的 JS 数据（BOOK_META、DOMAINS）和 bookshelf.html 中添加对应条目。

---

## 6. 开发工作流

### 6.1 本地预览

```bash
git clone https://github.com/Leoshuaihao/ai-reading-notes.git
cd ai-reading-notes
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

### 6.2 截图验证

```bash
pip install playwright && playwright install chromium

python3 << 'EOF'
from playwright.sync_api import sync_playwright

PAGES = ["index.html", "bookshelf.html", "concepts.html", "my.html"]
VIEWPORTS = [("desktop", 1440, 900), ("tablet", 768, 1024), ("mobile", 375, 812)]
BASE = "http://localhost:8080"

with sync_playwright() as p:
    browser = p.chromium.launch()
    for vp_name, vp_w, vp_h in VIEWPORTS:
        for page_path in PAGES:
            page = browser.new_page(viewport={"width": vp_w, "height": vp_h})
            page.goto(f"{BASE}/{page_path}", wait_until="networkidle")
            page.screenshot(path=f"screenshots/{vp_name}_{page_path.replace('.html','')}.png", full_page=True)
            page.close()
    browser.close()
EOF
```

### 6.3 部署

```bash
git add -A
git commit -m "描述修改内容"
git push origin main
# GitHub Pages 自动部署，等 1-2 分钟 CDN 刷新
```

---

## 7. 关键约束

### 7.1 不可修改

- `assets/css/style.css` 中的 CSS 变量名和组件类名——所有页面依赖它们
- `.top-nav` 的 HTML 结构——app.js 依赖它生成下拉菜单
- 章节链接格式 `#chN`——IntersectionObserver 依赖它追踪阅读进度
- `index.html` 中的 `BOOK_META` 和 `DOMAINS` 数据结构——五域体系核心数据源
- `localStorage` 键名：`reading_progress`、`my_principles`——跨页面数据共享

### 7.2 必须遵守

- 章节标题统一为 `第N章 · 标题` 格式
- 导航栏固定链接：修行 → 股票诊断 → 概念地图 → 书架
- 所有面向用户的文字必须中文化（详见 DOC_I18N.md）
- 封面设计用 CSS 渐变 + 文字，不用图片
- 新书添加后必须同步更新 index.html 和 bookshelf.html 中的数据

### 7.3 常见陷阱

| 症状 | 可能原因 | 解决 |
|------|---------|------|
| 新书在修行首页不显示 | 未更新 index.html 中的 BOOK_META 和 DOMAINS | 在 JS 数据配置中添加新书条目 |
| 新书在书架页不显示 | 未更新 bookshelf.html | 添加书籍卡片 HTML |
| 导航栏不显示下拉 | 章节链接 href 不是 `#ch` 开头 | 检查 nav-links 中的 a 标签 |
| 章节折叠不工作 | 检查 `data-no-collapse="true"` | 导言才需要此属性 |
| 中文化遗漏 | 新书未经过中文化检查 | 运行 DOC_I18N.md 中的检查脚本 |
| GitHub Pages 不更新 | 浏览器/CDN 缓存 | Ctrl+Shift+R 或等 5 分钟 |

---

## 8. 子文档索引

| 文档 | 内容 | 何时读 |
|------|------|--------|
| [ADD_BOOK_STANDARD.md](./ADD_BOOK_STANDARD.md) | 新书添加标准流程（V2 架构） | 添加新书前必读 |
| [DOC_CSS.md](./DOC_CSS.md) | CSS 变量、组件映射、响应式规则 | 修改样式前必读 |
| [DOC_JS.md](./DOC_JS.md) | JS 模块职责、交互逻辑、数据流 | 修改交互前必读 |
| [DOC_I18N.md](./DOC_I18N.md) | 中文化规则、保留项、检查脚本 | 内容生成后必读 |
| [DOC_TEST_DEPLOY.md](./DOC_TEST_DEPLOY.md) | Playwright 测试、GitHub Pages 部署 | 上线前必读 |
| [PRD_海外书籍AI精读平台_v1.md](./PRD_海外书籍AI精读平台_v1.md) | V1 PRD（历史参考） | 理解产品演进 |
| [PRD_海外书籍AI精读平台_v2.md](./PRD_海外书籍AI精读平台_v2.md) | V2 PRD（当前迭代规划） | 理解产品方向 |
| [PRD_股票诊断引擎_v1.md](./PRD_股票诊断引擎_v1.md) | 诊断引擎需求 | 修改诊断功能 |

---

## 9. 数据架构

### 9.1 跨页面数据流

```
用户行为（阅读/收藏）
    ↓
localStorage 写入
    ├── reading_progress: { "fisher": { chaptersRead: [1,2,3] }, ... }
    └── my_principles: ["安全边际", "护城河", ...]
    ↓
各页面读取
    ├── index.html: computeBookProgress() → 五域卡片 + 雷达图 + 等级
    ├── my.html: 阅读进度卡 + 成就判定 + 登山可视化
    └── books/*/index.html: app.js 章节折叠状态持久化
```

### 9.2 静态数据源

- `index.html` 内联 `<script>`：`BOOK_META`（16本书）+ `DOMAINS`（5域定义）+ `LEVELS`（9级）+ `LV_COLOR`/`LV_EMOJI`
- `bookshelf.html`：16 张书籍卡片（硬编码 HTML）
- 这两个数据源在新书添加时必须同步更新

# 新书添加标准化流程

> 适用场景：将一本海外投资书籍的 epub 转化为中文 AI 精读笔记页面并上线。
> 核心原则：**中文用户无需懂英文即可完整阅读**。

---

## 阶段一：素材准备

### 1.1 获取 epub
- 用户提供 epub 文件（上传到 `/root/uploads/`）
- 或提供下载链接由 AI 下载

### 1.2 解压并提取信息
```bash
unzip book.epub -d epub_temp/book-name/
```

从解压文件中提取：
| 信息 | 来源 | 用途 |
|------|------|------|
| 目录结构 (TOC) | `toc.ncx` | 章节规划和导航 |
| 章节清单 | HTML 文件名映射 | 了解每章内容 |
| 版权信息 | `copyright.html` 或 `titlepage.html` | 确认版本/年份 |
| 关键章节正文 | 前2-3章 HTML | 内容风格参考 |

### 1.3 版本确认
- 检查是否最新版本
- 如果用户提供的不是最新版，告知差异，等用户确认

### 1.4 确认清单（与用户对齐）
输出以下内容等用户确认后再生成：
```
📖 书名（中文）：_______
👤 作者（中文）：_______
📅 版本/年份：_______
📑 章节数：_______章
🏷️ 标签：_______（3-5个）
⭐ 豆瓣评分：_______（选填）
```

---

## 阶段二：内容生成

### 2.1 生成 HTML 文件

**文件位置**：`books/{book-slug}/index.html`

**页面结构**（固定顺序）：
```
1. Meta 标签（SEO + Schema.org 结构化数据）
2. 顶部导航栏 <nav class="top-nav">
3. 书籍 Hero 卡片 <section class="book-hero">
4. 为什么值得精读 <section> → .why-section (2×2 网格)
5. 作者简介 <section> → .author-bio
6. 核心框架图（如果书有框架）
7. 核心原则速览（如果书有原则清单）
8. 阅读路线图 <section> → .roadmap
9. 阅读进度条 <div class="progress-section">
10. 导言章节 <article class="chapter-card" data-no-collapse="true">
11. 章节卡片 <article class="chapter-card" id="ch1"> ... </article>
12. 诊断工具 CTA Banner
13. Footer
14. 回到顶部按钮 <button class="back-to-top">
15. 引用 JS <script src="../../assets/js/app.js">
```

### 2.2 每个章节卡片结构（模板）

```html
<article class="chapter-card" id="chN" aria-labelledby="chN-title">
  <div class="ch-header">
    <div class="ch-num">N</div>
    <div>
      <h2 class="ch-title" id="chN-title">第N章 · 章节标题</h2>
      <div class="ch-subtitle">副标题</div>
    </div>
  </div>

  <!-- 预览信息（自动生成） -->
  <div class="chapter-preview">
    <div class="preview-item">
      <span class="preview-label">🔑 关键概念：</span>
      <span class="preview-text">概念名</span>
    </div>
    <div class="preview-item">
      <span class="preview-label">🎯 核心问题：</span>
      <span class="preview-text">一句话核心问题</span>
    </div>
    <div class="preview-item">
      <span class="preview-label">💡 一句话：</span>
      <span class="preview-text">一句话总结</span>
    </div>
  </div>

  <!-- 以下 block 会被折叠 -->
  <div class="block">
    <div class="block-label"><span class="dot"></span> 🎯 核心问题</div>
    <div class="block-content"><p>...</p></div>
  </div>

  <div class="block">
    <div class="block-label"><span class="dot"></span> 关键概念</div>
    <div class="concept-box">...</div>
    <!-- 可多个 concept-box -->
  </div>

  <div class="block">
    <div class="block-label"><span class="dot"></span> 🌍 文化背景补充</div>
    <div class="context-box">...</div>
  </div>

  <div class="block">
    <div class="block-label"><span class="dot"></span> ⚔️ 反方观点</div>
    <div class="counter-box">...</div>
  </div>

  <div class="block">
    <div class="block-label"><span class="dot"></span> 🇨🇳 中国市场关联</div>
    <div class="china-box">...</div>
  </div>

  <div class="block">
    <div class="block-label"><span class="dot"></span> 📖 术语词典</div>
    <table class="term-table">...</table>
  </div>

  <div class="block">
    <div class="block-label"><span class="dot"></span> 🧠 思考题</div>
    <div class="exercise-box">...</div>
  </div>

  <!-- 金句 -->
  <div class="gold-quote">
    <details class="en-detail"><summary>📖 原文（点击展开）</summary>
      <div class="en">英文原文...</div>
    </details>
    <div class="zh">「中文翻译」</div>
    <div class="why">💬 解读</div>
  </div>

  <div class="block">
    <div class="block-label"><span class="dot"></span> 💡 一句话总结</div>
    <ul class="takeaway-list"><li>...</li></ul>
  </div>
</article>
```

### 2.3 内容块优先级

每个章节卡片按以下优先级填充（不是每章都需要全部）：

| 优先级 | 块类型 | 何时必选 | 何时可选/跳过 |
|--------|--------|----------|---------------|
| P0 必选 | 🎯 核心问题 | 每章 | — |
| P0 必选 | 关键概念 | 每章 | — |
| P0 必选 | 💡 一句话总结 | 每章 | — |
| P1 推荐 | 金句引用 | 有精彩原文时 | 非重点章可跳过 |
| P1 推荐 | 🌍 文化背景 | 涉及美国金融制度/历史 | 通用概念可跳过 |
| P2 可选 | ⚔️ 反方观点 | 概念有争议时 | 共识性内容跳过 |
| P2 可选 | 🇨🇳 中国市场 | 原则可对标A股时 | 不可对标时跳过 |
| P2 可选 | 📖 术语词典 | 本章有新术语时 | 无新术语跳过 |
| P2 可选 | 🧠 思考题 | 每章至少1题 | — |

---

## 阶段三：中文化检查

### 3.1 保留项（允许出现英文）

| 类别 | 示例 | 说明 |
|------|------|------|
| 专业缩写 | ROE, EPS, PE, PB, DCF, alpha, beta | 投资术语通用缩写 |
| 公司缩写 | GEICO, IBM | 已知公司的通用缩写 |
| en-detail 原文 | 金句原文（折叠） | 用户需点击才看到 |
| Schema.org | JSON-LD 结构化数据 | 搜索引擎用 |

### 3.2 必须翻译项

| 类别 | 反例 ❌ | 正例 ✅ |
|------|---------|---------|
| 作者名 | Philip A. Fisher | 菲利普·A·费雪 |
| 书名 | Common Stocks and Uncommon Profits | 怎样选择成长股 |
| 公司全名 | Columbia University Press | 哥伦比亚大学出版社 |
| 投资术语 | Anchoring | 锚定效应 |
| 行为金融术语 | Confirmation Bias | 确认偏误 |
| 方法名 | Scuttlebutt Method | 闲聊调研法 |
| 人名（序言作者） | Seth Klarman | 塞思·卡拉曼 |
| 版本描述 | Illuminated | 注解版 |
| meta 描述 | 全部中文化 | — |
| 首页标签 | PEG → PEG指标 | — |

### 3.3 自动检查脚本

```bash
# 检查残留英文（排除 en-detail 和缩写）
grep -nP '[A-Za-z]{4,}' books/new-book/index.html | \
  grep -v 'en-detail' | grep -v 'ROE\|EPS\|PE\|PB\|DCF\|GEICO\|IBM'
```

---

## 阶段四：导航栏配置

### 4.1 导航格式（强制统一）

所有章节链接格式：
```html
<a href="#chN">第N章 · 中文标题</a>
```

固定链接（始终在章节之前）：
```html
<a href="#overview">概览</a>
<a href="#roadmap">路线图</a>
<a href="#intro">导言</a>
```

### 4.2 无需手动配置

导航栏的下拉菜单、当前章节高亮、侧边栏面板均由 `app.js` 自动生成，HTML 中只需保留标准链接结构即可。

---

## 阶段五：书架首页更新

编辑 `/workspace/workbuddy/海外书籍AI精读平台/index.html`：

### 5.1 更新统计数据

```html
<div class="stats">
  <div class="stat-item">
    <div class="stat-num">N</div>  <!-- 更新书本数 -->
    <div class="stat-label">本精读笔记</div>
  </div>
  <div class="stat-item">
    <div class="stat-num">M</div>  <!-- 更新原则总数 -->
    <div class="stat-label">条投资原则</div>
  </div>
</div>
```

### 5.2 添加书籍卡片（模板）

```html
<div class="book-card">
  <div class="card-cover" style="background: linear-gradient(135deg, #色1, #色2);">
    <span class="status-badge available">已上线</span>
    <div class="cover-text">中文书名</div>
  </div>
  <div class="card-body">
    <h3>中文书名</h3>
    <div class="author">中文作者名 · 年份</div>
    <div class="desc">
      一段中文简介（100-150字），包含核心贡献和独特价值
    </div>
    <div class="tags">
      <span class="tag">标签1</span>
      <span class="tag">标签2</span>
      <span class="tag">X章精读</span>
    </div>
    <a class="card-btn primary" href="books/book-slug/">进入精读 →</a>
  </div>
</div>
```

### 5.3 Footer 更新

在每本书的 footer 中添加新书的交叉引用链接。

---

## 阶段六：部署上线

```bash
cd /workspace/workbuddy/海外书籍AI精读平台
git add books/new-book/ index.html
git commit -m "feat: 添加《书名》精读笔记（X章）"
git push origin main
```

部署后等待 1-2 分钟 GitHub Pages CDN 刷新。

---

## 完整检查清单

部署前逐项确认：

- [ ] 书名/作者/出版社全部中文化
- [ ] 所有章节标题统一为"第N章 · 标题"格式
- [ ] 首页卡片描述无英文（缩写除外）
- [ ] meta 标签和 og 标签中文化
- [ ] Schema.org 结构化数据中文化
- [ ] 章节预览（关键概念/核心问题/一句话）已生成
- [ ] 导航栏格式正确（概览→路线图→导言→章节）
- [ ] 阅读路线图、进度条已添加
- [ ] 回到顶部按钮 + JS 引用已添加
- [ ] 交叉链接 footer 已更新
- [ ] 书架首页统计数字已更新
- [ ] en-detail 原文已折叠
- [ ] 本地截图验证通过（桌面 1440px + 移动 375px）
- [ ] git push 成功

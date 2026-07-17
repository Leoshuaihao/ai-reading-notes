# CSS 架构文档 · AI 精读笔记平台

> 本文档详细说明全局样式表 `assets/css/style.css` 的设计体系。修改任何样式前，请先读完本文档。

---

## 1. 文件概览

| 属性 | 值 |
|------|-----|
| 文件路径 | `assets/css/style.css` |
| 当前行数 | ~524 行 |
| 加载方式 | `<link rel="stylesheet" href="../../assets/css/style.css">` |
| 适用范围 | 所有书籍页面 + 书架首页 |
| 设计理念 | 温润、阅读感、类纸质书 |

---

## 2. CSS 变量体系（:root）

所有颜色和阴影通过 CSS 变量统一管理，修改一处全局生效。

```css
:root {
  --bg: #faf9f5;              /* 页面背景 — 暖白 */
  --card: #ffffff;            /* 卡片背景 — 纯白 */
  --text: #2c2c2c;            /* 正文颜色 — 近黑 */
  --text-secondary: #6b6b6b;  /* 次要文字 — 中灰 */
  --accent: #c75b39;          /* 主强调色 — 陶土红 */
  --accent-light: #fdf0e8;    /* 主强调色浅底 */
  --border: #e8e5df;          /* 边框/分割线 */
  --tag-bg: #f4f1ea;          /* 标签背景 */
  --gold: #b8860b;            /* 金色 — 金句 */
  --green: #2d7d46;           /* 绿色 — 正面/增长 */
  --blue: #2c6faa;            /* 蓝色 — 概念/术语 */
  --purple: #7b4fbf;          /* 紫色 — 讨论/互动 */
  --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
}
```

### 变量用途速查

| 变量 | 主要使用场景 |
|------|------------|
| `--bg` | `body` 背景 |
| `--card` | 所有卡片组件（chapter-card, book-hero, author-bio 等） |
| `--text` | 正文段落 |
| `--text-secondary` | 辅助说明、描述文字、标签文字 |
| `--accent` | 链接悬停、按钮、进度条、章节编号圆圈、强调色 |
| `--accent-light` | 按钮悬停、标签背景、下拉高亮、TOC 活跃项 |
| `--border` | 分割线、卡片边框、表格边框 |
| `--tag-bg` | 元信息标签 |
| `--gold` | 金句引用框（gold-quote）边框和文字 |
| `--green` | 正面信号（较少用，保留） |
| `--blue` | 概念框（concept-box）标题、术语表英文 |
| `--purple` | 讨论框（discuss-box）计数 |
| `--shadow` | 卡片默认阴影 |
| `--shadow-md` | Hero、下拉面板等较重阴影 |

---

## 3. 组件类名索引

### 3.1 导航系统

| 类名 | 用途 | 关键属性 |
|------|------|---------|
| `.top-nav` | 顶部导航容器 | `position: sticky; top: 0; z-index: 100` |
| `.top-nav .logo` | Logo 文字 | `color: var(--accent)` |
| `.top-nav .nav-links` | 导航链接列表 | `display: flex; gap: 16px` |
| `.top-nav .nav-links a` | 单个导航链接 | `font-size: 14px` |
| `.top-nav .nav-links a.active` | 当前活跃链接 | 下划线高亮 |
| `.top-nav .badge` | 导航栏徽章 | `background: var(--accent); border-radius: 10px` |
| `.nav-chapter-trigger` | 桌面端章节下拉触发器 | `@media (min-width: 769px)` 可见 |
| `.nav-chapter-dropdown` | 章节下拉面板 | `position: absolute; max-height: 60vh; overflow-y: auto` |
| `.nav-chapter-dropdown a` | 下拉面板内链接 | `display: block; padding: 10px 20px` |
| `.nav-sep` | 导航分隔线 | `width: 1px; height: 20px` |
| `.nav-toggle` | 移动端汉堡菜单按钮 | `@media (max-width: 768px)` 可见 |
| `.nav-toggle span` | 汉堡菜单三条线 | 点击变形为 ✕ |

### 3.2 布局

| 类名 | 用途 |
|------|------|
| `.container` | 内容主容器 `max-width: 880px` |
| `.container.wide` | 宽版容器 `max-width: 960px` |

### 3.3 书籍 Hero

| 类名 | 用途 |
|------|------|
| `.book-hero` | Hero 卡片容器 `display: flex; gap: 32px` |
| `.book-hero .sample-badge` | 左上角"精读样本"角标 |
| `.book-hero .cover` | 封面方块 `140×200px`，CSS 渐变背景 |
| `.book-hero .info` | 右侧信息区域 |
| `.book-hero .info h1` | 书名 `font-size: 28px` |
| `.book-hero .info .author` | 作者 |
| `.book-hero .info .meta-row` | 标签行 `flex-wrap: wrap` |
| `.book-hero .info .meta-row .tag` | 元信息标签 |
| `.book-hero .info .meta-row .tag.primary` | 主标签（强调色背景） |
| `.book-hero .info .desc` | 书籍简介 |
| `.cta-btn` | CTA 按钮 `border-radius: 24px` |

### 3.4 章节卡片

| 类名 | 用途 |
|------|------|
| `.chapter-card` | 章节卡片 `border-left: 4px solid transparent`，hover 变 accent |
| `.chapter-card .ch-header` | 章节头部 |
| `.chapter-card .ch-num` | 圆形编号 `36×36px` |
| `.chapter-card .ch-title` | 章节标题 `font-size: 20px` |
| `.chapter-card .ch-subtitle` | 章节副标题 |
| `.chapter-preview` | 折叠时的预览信息 `flex; gap: 12px` |
| `.chapter-preview .preview-item` | 预览项 `background: var(--tag-bg)` |
| `.chapter-preview .preview-item .preview-label` | 预览标签（粗体） |
| `.chapter-preview .preview-item .preview-text` | 预览文字（2行截断） |

### 3.5 内容块

| 类名 | 用途 |
|------|------|
| `.block` | 通用内容块 `margin-bottom: 24px` |
| `.block-label` | 块标签 `text-transform: uppercase; font-size: 13px` |
| `.block-label .dot` | 标签前彩色圆点 |
| `.block-content` | 块正文 |
| `.section-title` | 章节标题 `border-bottom: 2px solid var(--accent)` |

### 3.6 特殊内容框

| 类名 | 用途 | 配色 |
|------|------|------|
| `.gold-quote` | 金句引用 | 金色系：`#fdf8f0` 背景，`#e8d5b0` 边框 |
| `.gold-quote .en` | 英文原文 | `font-style: italic; color: #5c4a2a` |
| `.gold-quote .zh` | 中文翻译 | `color: #7a6238` |
| `.gold-quote .why` | 入选理由 | 顶部分割线 |
| `.en-detail` | 英文原文折叠块 | `<details>` 元素样式 |
| `.concept-box` | 核心概念框 | 蓝色系：`#f8fafb` 背景 |
| `.concept-box .concept-name` | 概念名 | `color: var(--blue)` |
| `.concept-box .concept-en` | 英文概念 | `font-style: italic` |
| `.context-box` | 时代背景框 | 绿色系：`#f5f8f0` |
| `.counter-box` | 反方观点框 | 红色系：`#fdf5f5` |
| `.china-box` | 中国市场关联 | 暖色系：`#fdf7f0` |
| `.exercise-box` | 思考题框 | 虚线边框 |
| `.discuss-box` | 讨论区框 | 紫色系：`#f9f7fc` |
| `.term-table` | 术语词典表 | 全宽表格 |
| `.takeaway-list` | 要点清单 | ✦ 标记 |

### 3.7 交互组件

| 类名 | 用途 |
|------|------|
| `.collapsible-section` | 可折叠区域 `transition: max-height 0.5s` |
| `.collapsible-section.collapsed` | 折叠状态 `max-height: 0` |
| `.collapsible-section.expanded` | 展开状态 |
| `.toggle-btn` | 折叠/展开按钮 |
| `.toggle-btn.expanded` | 展开状态按钮 |
| `.preview-hint` | 折叠时提示文字 |
| `.progress-section` | 阅读进度条容器 |
| `.progress-bar` | 进度条轨道 |
| `.progress-bar .fill` | 进度条填充 `transition: width 0.5s` |
| `.progress-text` | 进度文字 |

### 3.8 TOC 侧边面板

| 类名 | 用途 |
|------|------|
| `.toc-trigger` | 浮动触发按钮 `position: fixed; bottom: 80px; right: 24px` |
| `.toc-trigger.visible` | 可见状态 `display: flex` |
| `.toc-panel` | 滑出面板 `transform: translateX(100%)` → `translateX(0)` |
| `.toc-panel.open` | 打开状态 |
| `.toc-panel .toc-panel-header` | 面板头部（标题 + 关闭按钮） |
| `.toc-panel .toc-panel-list` | 链接列表 `overflow-y: auto` |
| `.toc-panel .toc-panel-list a.active` | 当前章节高亮 |
| `.toc-overlay` | 遮罩层 `background: rgba(0,0,0,0.3)` |
| `.toc-overlay.open` | 遮罩打开 |
| `.toc-float` | 旧版 TOC（已废弃，`display: none !important`） |

### 3.9 辅助组件

| 类名 | 用途 |
|------|------|
| `.back-to-top` | 回到顶部按钮 `position: fixed; bottom: 24px` |
| `.back-to-top.visible` | 可见状态 |
| `.roadmap` | 阅读路线图 `display: grid; auto-fit, minmax(240px, 1fr)` |
| `.roadmap .part-card` | 路线图卡片 |
| `.roadmap .part-card.current` | 当前阶段卡片 |
| `.why-section` | "为什么值得精读" 2×2 网格 |
| `.why-item` | 原因项卡片 |
| `.author-bio` | 作者简介卡片 |
| `.author-bio .avatar` | 头像 `80×80px` 圆形 |
| `.author-bio .bio-highlight` | 高亮标签 |
| `.principle-index` | 原则速览索引 `flex-wrap: wrap` |

### 3.10 AI 对话组件

| 类名 | 用途 |
|------|------|
| `.chat-widget` | 对话组件容器 |
| `.chat-widget .chat-header` | 对话头部（可点击折叠） |
| `.chat-widget.open .chat-body` | 展开的对话内容 |
| `.chat-widget .chat-msg` | 消息行 |
| `.chat-widget .chat-msg.ai` | AI 消息（左侧） |
| `.chat-widget .chat-msg.user` | 用户消息（右侧） |
| `.chat-widget .chat-msg .bubble` | 消息气泡 |
| `.chat-widget .chat-msg .bubble .cite` | 引用块（金句引用） |
| `.chat-widget .chat-input-area` | 输入区域 |
| `.chat-widget .typing-indicator` | 输入中指示器 |
| `.chat-widget .chat-error` | 错误提示 |

---

## 4. 响应式断点策略

### 4.1 主断点：768px

```css
/* 移动端 (≤768px) */
@media (max-width: 768px) { ... }

/* 桌面端 (≥769px) */
@media (min-width: 769px) { ... }
```

### 4.2 桌面端专属 (≥769px)

| 特性 | 行为 |
|------|------|
| 导航栏 | 章节链接隐藏（`.ch-nav { display: none }`），只显示当前章节 |
| 章节下拉 | 触发器 `.nav-chapter-trigger` 可见 |
| 汉堡按钮 | 隐藏 `.nav-toggle { display: none }` |
| 分隔线 | `.nav-sep` 可见 |

### 4.3 移动端专属 (≤768px)

| 特性 | 行为 |
|------|------|
| 导航栏 | 所有链接进入全屏汉堡菜单 `.nav-links.open` |
| 汉堡按钮 | 显示 `.nav-toggle { display: flex }` |
| 章节下拉 | 隐藏 |
| Hero 卡片 | 垂直排列 `flex-direction: column` |
| 封面 | 缩小到 `100×144px` |
| 标题 | 缩小到 `22px` |
| Why 区域 | 单列 `grid-template-columns: 1fr` |
| 路线图 | 单列 |
| 章节预览 | 垂直排列 `flex-direction: column` |
| 折叠按钮 | 全宽 `width: 100%` |
| 对话气泡 | 缩小到 `max-width: 80%; font-size: 13px` |
| 输入框 | `font-size: 16px`（防止 iOS 自动缩放） |

### 4.4 TOC 触发断点：1200px

```css
@media (max-width: 1200px) {
  .toc-trigger { display: flex !important; }
}
```

TOC 浮动按钮在视口 ≤1200px 时强制显示。在超大屏幕上不显示（因为章节内容足够宽，用户直接滚动即可）。

---

## 5. Emoji 字体回退策略

```css
body {
  font-family: -apple-system, ..., "PingFang SC", "Microsoft YaHei",
               "Noto Color Emoji", "Segoe UI Emoji", sans-serif;
}

.emoji {
  font-family: "Apple Color Emoji", "Segoe UI Emoji",
               "Noto Color Emoji", "Android Emoji", sans-serif;
  display: inline-block;
  min-width: 1.2em;
  text-align: center;
}

.emoji-fallback { ... }  /* 当 emoji 不可用时的圆形彩色替代 */
```

- `body` 字体栈以系统字体优先，最后回退到 emoji 字体
- `.emoji` 类强制使用 emoji 字体栈，确保 emoji 彩色渲染
- `.emoji-fallback` 是纯 CSS 回退方案（彩色圆形+文字），极少触发

---

## 6. Z-Index 层级体系

| 层级 | z-index | 组件 |
|------|---------|------|
| 基础 | 默认 | 所有正常流内容 |
| 导航 | 100 | `.top-nav` |
| 下拉 | 150 | `.nav-chapter-dropdown`, `.toc-trigger` |
| 遮罩 | 170 | `.toc-overlay` |
| 面板 | 180 | `.toc-panel` |
| 最高 | 200 | `.back-to-top` |

---

## 7. 动画与过渡

| 元素 | 动画 | 时长 |
|------|------|------|
| 导航链接下划线 | `transition: all 0.2s` | 200ms |
| 下拉箭头旋转 | `transform: rotate(180deg)` | 200ms |
| 章节卡片悬停 | `transition: all 0.3s` | 300ms |
| 折叠/展开 | `transition: max-height 0.5s, opacity 0.3s` | 500ms/300ms |
| TOC 面板滑出 | `transform: translateX(100%) → 0` | 300ms |
| 遮罩淡入 | `opacity: 0 → 1` | 300ms |
| 进度条填充 | `transition: width 0.5s` | 500ms |
| 打字指示器 | `@keyframes blink` | 1.4s 循环 |

---

## 8. 添加新组件的规范

1. **颜色**：优先使用 CSS 变量，避免硬编码色值
2. **间距**：保持 4px 倍数体系（4, 8, 12, 16, 20, 24, 32, 40）
3. **圆角**：卡片 `12px`，按钮 `20px/24px`，标签 `20px`，小元素 `8px/10px`
4. **阴影**：使用 `var(--shadow)` 或 `var(--shadow-md)`
5. **字体大小**：正文 `15-16px`，标题 `20-28px`，辅助 `12-14px`
6. **响应式**：每个新组件考虑 ≤768px 下的表现
7. **可访问性**：交互元素添加 `:focus-visible` 样式（参考第 516-523 行）

---

## 9. 常见修改指南

### 更换主题色

修改 `--accent` 和 `--accent-light` 两个变量即可，全局生效。

### 调整内容宽度

修改 `.container` 的 `max-width`（默认 880px）。

### 修改导航栏高度

修改 `.top-nav` 的 `height: 56px`，同时修改：
- app.js 中的滚动偏移量 `- 60`（多处）
- `.nav-chapter-dropdown` 的 `top: calc(100% + 8px)`

### 修改移动端断点

全局替换 `768px` 和 `769px` 为新断点值。注意 `min-width: 769px` 必须比 `max-width: 768px` 大 1px。

---

## 10. 文件末尾

样式表以无障碍 focus 样式结束：

```css
.toggle-btn:focus-visible,
.cta-btn:focus-visible,
.back-to-top:focus-visible,
.chat-widget .chat-header:focus-visible,
.chat-widget .chat-input-area button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

这是整个样式表的最后一段，新增样式请添加在此之上。

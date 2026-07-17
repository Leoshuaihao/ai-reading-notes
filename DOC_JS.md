# JavaScript 架构文档 · AI 精读笔记平台

> 本文档详细说明 `assets/js/app.js` 和 `assets/js/chat.js` 的架构设计。修改任何交互逻辑前，请先读完本文档。

---

## 1. 文件概览

| 文件 | 行数 | 模式 | 职责 |
|------|------|------|------|
| `assets/js/app.js` | ~378 行 | IIFE | 核心交互：折叠/展开、导航、TOC、进度条、滚动 |
| `assets/js/chat.js` | ~200 行 | IIFE | AI 对话模块：消息收发、API 调用、打字效果 |

两个文件都是 IIFE（立即执行函数表达式）模式，无全局变量污染。

---

## 2. app.js 模块详解

### 2.1 整体结构

```
(function() {
  'use strict';

  // 模块1: 章节折叠/展开 (行 9-95)
  // 模块2: 导航栏章节下拉菜单 (行 98-160)
  // 模块3: TOC 侧边面板 (行 162-246)
  // 模块4: 导航平滑滚动 (行 249-261)
  // 模块5: IntersectionObserver (行 264-332)
  // 模块6: 回到顶部按钮 (行 335-349)
  // 模块7: Android resize debounce (行 352-358)
  // 模块8: 键盘导航支持 (行 361-376)
})();
```

### 2.2 模块1：章节折叠/展开（行 9-95）

**核心逻辑**：

```
遍历所有 .chapter-card →
  如果 blocks < 3 或 data-no-collapse="true" → 跳过
  保留第一个 block 可见，其余移入 .collapsible-section.collapsed
  创建展开按钮 + 预览提示
  恢复 localStorage 持久化状态
```

**关键实现细节**：

- `scrollHeight` 动态计算高度（而非固定值），解决内容长度不同的问题
- 展开后 500ms 将 `max-height` 设为 `none`，避免内容被截断
- 折叠时先设 `scrollHeight` 再 `force reflow` 再设 `0`，确保动画触发
- localStorage 异常（QuotaExceeded、隐私模式）静默降级

**DOM 结构约定**：

```html
<article class="chapter-card" id="ch1">
  <div class="block">...</div>  <!-- 第一个 block：核心问题（保持可见） -->
  <div class="block">...</div>  <!-- 后续 block：被 JS 移入折叠区 -->
  <div class="block">...</div>
  <!-- JS 动态插入 -->
  <div class="preview-hint">点击展开：包含核心概念解读...</div>
  <button class="toggle-btn">展开完整精读 ▾</button>
</article>
```

**存储键格式**：`book_expanded_{章节ID}`，例如 `book_expanded_ch1`

### 2.3 模块2：导航栏章节下拉菜单（行 98-160）

**触发条件**：导航栏中存在 `href` 以 `#ch` 开头的链接

**执行流程**：

```
1. 查找所有 a[href^="#ch"] 链接
2. 创建 .nav-chapter-trigger 按钮（章节导航 ▾）
3. 创建 .nav-chapter-dropdown 面板
4. 创建 .nav-sep 分隔线
5. 将所有章节链接 clone 移入下拉面板
6. 在第一个章节链接前插入：分隔线 + 触发器
7. 触发器点击 → toggle open
8. 页面其他区域点击 → close
```

**CSS 依赖**：
- `.nav-chapter-trigger` 在 `@media (min-width: 769px)` 下可见
- `.nav-chapter-dropdown` 默认 `display: none`，`.open` 时 `display: block`
- 移动端（≤768px）所有下拉相关元素 `display: none`

**注意事项**：
- 下拉面板内链接的 `href` 必须指向页面内锚点（`#ch1` 等）
- 滚动偏移为 `-60`（56px 导航栏 + 4px 余量）

### 2.4 模块3：TOC 侧边面板（行 162-246）

**组件结构**（全部由 JS 动态创建）：

```
body
├── .toc-trigger (button)       ← 浮动触发按钮 📑
├── .toc-overlay (div)          ← 半透明遮罩
└── .toc-panel (div)            ← 滑出面板
    ├── .toc-panel-header       ← 标题 + 关闭按钮 ✕
    └── .toc-panel-list         ← 所有导航链接的 clone
```

**交互流程**：

```
点击 📑 → openPanel()
  ├── .toc-panel + .open (translateX: 100% → 0)
  ├── .toc-overlay + .open (opacity: 0 → 1)
  ├── 隐藏 📑 按钮
  └── body overflow: hidden (防止背景滚动)

关闭（点击 ✕ / 遮罩 / ESC） → closePanel()
  ├── 移除 .open
  ├── 恢复 📑 按钮
  └── body overflow: 恢复
```

**显示条件**：
- 滚动超过 600px 后 📑 按钮出现
- 150ms debounce 防止频繁切换
- ≤1200px 视口始终可用（CSS 控制）

### 2.5 模块4：导航平滑滚动（行 249-261）

```javascript
function addSmoothScroll(links) {
  links.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        const top = target.getBoundingClientRect().top + window.pageYOffset - 60;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}
```

**作用**：拦截所有导航链接点击，改为平滑滚动到目标锚点。

**滚动偏移**：`-60px`（56px 导航栏 + 4px 呼吸空间）。

### 2.6 模块5：IntersectionObserver（行 264-332）

**这是最复杂的模块，负责四个功能**：

| 功能 | 机制 |
|------|------|
| 导航高亮 | 当前可见章节 → 对应 nav 链接加 `.active` |
| 下拉同步 | 同时更新下拉面板中的 `.active` |
| TOC 同步 | 同时更新侧边面板中的 `.active` |
| 进度条 | 更新 `.progress-bar .fill` 宽度 + `.progress-text` 文字 |
| URL hash | `history.replaceState` 同步地址栏（不产生历史记录） |

**Observer 配置**：

```javascript
{ rootMargin: '-60px 0px -60% 0px' }
```

- `-60px` 顶部偏移（导航栏高度）
- `-60%` 底部偏移（元素必须进入视口上半部分才算可见）

**监听目标**：页面上所有带 `id` 且 id 以 `ch` 开头或为 `intro` 的元素。

**URL 锚点处理**：
- 页面加载时如果有 `hash`，300ms 后平滑滚动到目标
- 监听 `popstate` 事件，支持浏览器前进/后退

### 2.7 模块6：回到顶部按钮（行 335-349）

```javascript
const btObserver = new IntersectionObserver(entries => {
  backToTop.classList.toggle('visible', !entries[0].isIntersecting);
}, { threshold: 0 });
btObserver.observe(document.querySelector('.book-hero'));
```

- 当 `.book-hero` 完全离开视口时，按钮出现
- 支持键盘 `Enter`/`Space` 触发

### 2.8 模块7：Android resize debounce（行 352-358）

Android Chrome 地址栏显示/隐藏会触发 `resize` 事件，此模块消费该事件防止意外滚动逻辑触发。250ms debounce。

### 2.9 模块8：键盘导航支持（行 361-376）

- 为 `.chat-widget .chat-header` 添加 `tabindex="0"` 和键盘事件（Enter/Space 触发点击）
- 为所有导航链接添加 `tabindex="0"`

---

## 3. chat.js 模块概述

chat.js 负责每个章节卡片底部的 AI 对话组件：

- 点击对话头部展开/折叠聊天区
- 发送消息到 Cloudflare Worker API
- 流式/非流式响应处理
- 打字指示器动画
- 错误状态展示
- 金句引用（`.cite`）渲染

**API 端点**：`https://ai-reading-worker.xxx.workers.dev/api/chat`（通过 Cloudflare Worker 代理）

---

## 4. 数据流图

```
用户交互
  │
  ├─ 点击折叠按钮 → toggle → localStorage 持久化
  ├─ 滚动页面 → IntersectionObserver
  │               ├─ 导航高亮
  │               ├─ 下拉同步
  │               ├─ TOC 同步
  │               ├─ 进度条更新
  │               └─ URL hash 同步
  ├─ 点击导航链接 → 平滑滚动 → IntersectionObserver 触发
  ├─ 点击 📑 → TOC 面板滑出
  ├─ 点击展开对话 → chat.js → Worker API → 渲染回复
  └─ 滚动 > 600px → 📑 按钮显示 / 回到顶部按钮显示
```

---

## 5. 依赖关系

```
app.js 依赖:
  ├── style.css (CSS 类名 .chapter-card, .collapsible-section, .toc-panel 等)
  ├── HTML 结构 (导航栏 .nav-links a[href^="#ch"], .book-hero, .back-to-top 等)
  └── localStorage API (可选，不可用时降级)

chat.js 依赖:
  ├── style.css (.chat-widget 系列类名)
  ├── HTML 结构 (.chat-widget 内部结构)
  └── fetch API + Cloudflare Worker 端点

无 JS 框架依赖，无第三方库依赖。
```

---

## 6. 添加新交互功能的规范

1. **写在 IIFE 内**：`(function() { 'use strict'; ... })()`
2. **使用现有 CSS 变量**：不硬编码颜色
3. **考虑移动端**：触摸事件、合理尺寸
4. **异常处理**：localStorage、fetch 等可能失败的操作用 try-catch
5. **性能**：滚动事件用 debounce/throttle，Observer 优于 scroll 事件
6. **可访问性**：添加 `aria-*` 属性、键盘支持、focus 样式

---

## 7. 常见问题

### 下拉菜单不显示
- 检查章节链接 href 是否以 `#ch` 开头（app.js 行 98）
- 检查 CSS 媒体查询 `@media (min-width: 769px)` 是否生效

### 章节折叠后预览内容为空
- 确保第一个 `.block` 的 `.block-label` 包含"核心问题"或"一句话总结"

### TOC 面板链接点击无反应
- 检查目标锚点是否存在于页面中
- 检查是否被其他元素遮挡（z-index 问题）

### 进度条不更新
- 检查章节元素是否有 `id` 属性且以 `ch` 开头或为 `intro`
- 检查 `.progress-section` 是否存在于页面

# 新书添加标准化流程（V4 精简重写版）

> V4 相比 V3：将散落各处的设计决议收敛为"设计原则"一章，正文中仅描述正确形态，不再出现"先说要 A、后来说不要 A"的矛盾叙述。所有过去决议归入版本历史。
>
> 适用场景：将一本海外投资书籍的 epub 转化为中文 AI 精读笔记页面并上线。
> 核心原则：**中文用户无需懂英文即可完整阅读**；**与其他书视觉/结构完全对齐**。

---

## 一、设计原则

以下规则统揽全书，正文各阶段不重复声明。

### 1.1 页面结构（固定顺序，13 项）

```
1.  Meta 标签 + Schema.org 结构化数据
2.  顶部导航栏
3.  书籍 Hero 卡片（封面渐变 + 标题/作者/标签）
4.  为什么值得精读（2×2 网格，4 个书专属理由）
5.  作者简介（缩写渐变头像 + 2 段生平 + bio-highlight 标签）
6.  核心框架图（如书有框架时）
7.  核心原则速览（如书有原则清单时）
8.  阅读路线图（🗺️ + .roadmap + .part-card 模块卡片）
9.  阅读进度条
10. 章节卡片（article.chapter-card，每章 9 block）
11. Footer
12. 回到顶部按钮
13. 脚本引用（data_v2.js → app.js → local-auth.js → supabase-auth.js → chat.js）
```

### 1.2 章节 Block 优先级（9 block）

| 优先级 | Block | 何时出现 |
|--------|-------|----------|
| P0 | 1.章节定位 | 每章 |
| P0 | 3.核心概念 | 每章 |
| P0 | 8.要点总结 | 每章 |
| P1 | 2.金句 | 有精彩原文时 |
| P1 | 4.文化背景 | 涉及美国制度/历史语境时 |
| P1 | 6.中国市场 | 原则可对标 A 股时（默认尽量做，仅完全不可对标时跳过） |
| P1 | 9.思考题 | 每章至少 1 题，嵌入 chat-widget |
| P2 | 5.反方观点 | 概念有争议时（共识性内容跳过） |
| P2 | 7.术语词典 | 本章有 ≥2 个新术语时（不足则跳过） |

### 1.3 强制规则（不可偏离）

- **阅读路线图**：必须用 `🗺️` + `.roadmap` + `.part-card` 模块卡片。早已废弃的 `📋` + `.chapter-nav` 链接列表在任何情况下都禁止出现。
- **block-label**：统一使用 `<div class="block-label">`，不用 `<h3>`。
- **金句折叠**：英文原文放在 `<details class="en-detail">` 内折叠。
- **CTA Banner**：已从所有页面移除，新书不得包含。
- **chat-widget**：每章底部至少一个，嵌入思考题 Box 内，chat.js 必须引入。
- **中文输出**：除专业缩写（DCF/PE/ROE/EPS）外全部中文。禁止在正文中使用"中文（English）"括号注记。
- **每章输入**：≥ 4000 字原文。
- **API temperature**：0.3。
- **Schema.org**：desc 截取前 250 字符。
- **why_items**：4 个书专属理由（含具体数据/案例），禁止模板化套话。
- **进度条**：章节计数仅匹配 `article.chapter-card` 元素，排除 chat-widget 等内部元素。
- **删书安全**：数据层使用 V2 BOOK_REGISTRY，删书只需 `delete BOOK_REGISTRY['slug']`。
- **内容质量**：章节内容必须基于原文，不得编造不存在的事实/数据/案例；术语 en 字段必须非空；quote 必须精确摘录自原文。

---

## 二、阶段一：素材准备与验证

### 门控清单（8 项）

1. epub 文件已定位，`file` 命令验证为 EPUB/ZIP
2. 章节已提取到 `/tmp/book_chapters/{slug}.json`（顶层 JSON 数组格式）
3. 逐章字数统计完成，< 500 字的异常章节已标记/修复
4. epub 章节数与提取章节数一致
5. 用户已确认：书名/作者/版本/章节数/标签
6. 审计元数据已写入章节缓存 JSON（confirmed_slug/confirmed_title/confirmed_at/file_validated）

### 操作步骤

```bash
# 验证文件类型
file epub/book.epub                     # 期望: EPUB document

# 提取章节（项目已有提取脚本，生成顶层数组 JSON）
python3 extract.py epub/book.epub $SLUG > /tmp/book_chapters/$SLUG.json
```

**字数阈值**：≥1000 正常 / 500-1000 警告 / <500 错误需重提取。

**确认清单输出格式**：
```
📖 书名：_______
👤 作者：_______
📅 版本/年份：_______
📑 章节数：_______章 ✅
🏷️ 标签：_______
📄 文件验证：EPUB ✅
```

---

## 三、阶段二：内容生成

### 3.1 脚本配置

在 `gen_books_v2.py` 的 `BOOKS` 字典中添加配置，包含全部必填字段：

```python
BOOKS = {
    "book-slug": {
        "title": "中文书名",
        "author": "中文作者名",
        "author_en": "English Name",
        "year": "年份",
        "domain_cn": "域中文名",
        "domain_key": "mind",            # mind/value/cycle/uncertainty/business
        "chapter_file": "book.json",     # /tmp/book_chapters/ 下的文件

        # 视觉
        "cover_gradient": "linear-gradient(...)",
        "cover_text": "English Title",
        "author_initials": "AB",

        # 内容（必须书专属，不允许模板化套话）
        "subtitle": "副标题",
        "desc": "100-200 字书籍简介",
        "why_items": [
            ("🏆", "具体理由标题", "80-150 字具体理由含数据/案例"),
            ...  # 共 4 个
        ],
        "author_bio": "200-400 字作者生平，含具体成就",
        "author_tags": ["标签1", "标签2", "标签3"],
        "author_avatar": "",             # Q 版头像路径，空字符串用缩写渐变回落

        # 路线图
        "roadmap_intro": "N 章分 M 个模块的导读说明",
        "roadmap_modules": [
            {"num": "模块1", "title": "名称", "pages": "ChX-Y · 主题"},
            ...  # 3-6 个模块
        ],
    },
}
```

### 3.2 运行生成

```bash
python3 gen_books_v2.py book-slug
```

脚本自动：生成章节 JSON（3 并发，增量保存）→ 构建 HTML → 输出到 `books/{slug}/index.html`。

### 3.3 章节卡片模板

每个章节卡片 `<article class="chapter-card">` 包含 chapter-preview（1-3 项，关键概念必填，其余两项有内容时渲染）和按优先级排列的 block：

```html
<article class="chapter-card" id="chN">
  <div class="ch-header">
    <!-- 章节号 + 标题 + preview 预览 -->
    <div class="chapter-preview">
      <div class="preview-item">🔑 关键概念：...</div>
      <div class="preview-item">🎯 核心问题：...</div>  <!-- 可选 -->
      <div class="preview-item">💡 一句话：...</div>     <!-- 可选 -->
    </div>
  </div>

  <!-- P0: 章节定位 -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:var(--gold)"></span> 章节定位</div>
    <p>40-80 字</p>
  </div>

  <!-- P1: 金句（有原文时） -->
  <div class="gold-quote">
    <details class="en-detail"><summary>📖 原文（点击展开）</summary><div class="en">英文原文</div></details>
    <div class="zh">「中文翻译」</div>
    <div class="why">💬 解读</div>
  </div>

  <!-- P0: 核心概念 -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:var(--blue)"></span> 核心概念深度解读</div>
    <div class="concept-box"><h3>概念名</h3><p>200-350 字深度解读</p></div>
  </div>

  <!-- P1: 文化背景（有语境时） -->
  <div class="block"><div class="block-label">文化背景</div>...</div>

  <!-- P2: 反方观点（有争议时） -->
  <div class="block"><div class="block-label">反方观点</div>...</div>

  <!-- P1: 中国市场（默认尽量做） -->
  <div class="block"><div class="block-label">中国市场关联</div>...</div>

  <!-- P2: 术语词典（≥2 个新术语时） -->
  <div class="block"><div class="block-label">关键术语词典</div>...</div>

  <!-- P0: 要点总结 -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:var(--accent)"></span> 本章要点总结</div>
    <ul class="takeaway-list"><li>要点 1</li><li>要点 2</li><li>要点 3</li></ul>
  </div>

  <!-- P1: 思考题（每章至少 1 题） -->
  <div class="block">
    <div class="block-label">思考题</div>
    <div class="exercise-box">
      <p class="q">题目</p>
      <p class="hint">提示</p>
      <!-- chat-widget 嵌入此处 -->
    </div>
  </div>
</article>
```

### 3.4 门控快速检查

```bash
grep -c 'class="roadmap"'     books/$SLUG/index.html   # ≥1
grep -c 'chapter-card'        books/$SLUG/index.html   # = 章节数
grep -c 'en-detail'           books/$SLUG/index.html   # ≥ 金句数
grep -c '<div class="block-label"' books/$SLUG/index.html  # block 数
grep -c '<h3 class="block-label"' books/$SLUG/index.html   # 必须 = 0
grep -c 'chat-widget'         books/$SLUG/index.html   # ≥ 章节数
grep -c 'chat.js'             books/$SLUG/index.html   # = 1
grep -c '中国市场'            books/$SLUG/index.html   # ≥ 章节数×50%
```

---

## 四、阶段三：脚本参数校验

- BOOKS 配置字段完整
- chapter_file 指向正确
- why_items 含具体数据/案例，非模板化
- temperature = 0.3
- 增量保存进度有效

---

## 五、阶段四：中文化检查

**允许出现的英文**：DCF/PE/ROE/EPS 等专业缩写、en-detail 折叠块内、封面英文装饰、Schema.org JSON-LD。

**必须中文化的项目**：书名/作者/出版社、meta description、og 标签、Schema.org 结构化数据。

**其余全部中文**。确认正文中无"中文（English）"括号注记。

```bash
# 残留英文扫描
grep -nP '[A-Za-z]{4,}' books/$SLUG/index.html | \
  grep -v 'en-detail' | grep -v 'ROE\|EPS\|PE\|PB\|DCF\|http\|https\|url\|aria\|var\|span\|div\|nav\|img\|src\|alt\|href\|class\|style\|data\|true\|false\|null\|function\|return\|document\|window\|querySelector\|getElementById\|toggle\|scroll\|preventDefault\|stopPropagation\|chat\|Chat\|sendChat\|toggleChat\|supabase\|localStorage\|getItem\|setItem'
```

---

## 六、阶段五：导航栏

- 固定链接：概览 → 路线图 → 导言 → 各章
- 章节链接格式：`第N章 · 中文标题`
- 下拉菜单和当前高亮由 app.js 自动处理

---

## 七、阶段六：数据层注册与书架更新

### 7.1 BOOK_REGISTRY 注册

在 `data_v2.js` 的 `BOOK_REGISTRY` 中添加条目，包含四个必需字段：

```
basic:          slug/title/author/chapters/school/schoolName
conceptMappings: [{id, chapters, usage, stance}]
domainPath:     {primary:{key, level}, cross:[...]}
promptInfo:     {persona, tone}
```

### 7.2 书架、首页、死链扫描

- bookshelf.html 添加书籍卡片 + 更新 hero 统计
- 死链扫描确认无指向已删书的链接
- 首页动态计数与 BOOK_REGISTRY 条目数一致

---

## 八、阶段七：视觉验证

用 Playwright 或手动打开页面确认三处：
1. 顶部（hero + why-section）
2. 路线图区域（确认是 🗺️ 模块卡片）
3. 第 1 章（P0 block 完整，chapter-preview 不少于 1 项）
4. 与已有书（如 fisher 或 buffett-way）对比，确认结构一致

---

## 九、阶段八：部署上线

```bash
git add books/$SLUG/ assets/js/data_v2.js bookshelf.html
git commit -m "feat: 添加《书名》精读笔记（N 章）"
git push
sleep 60
curl -s -o /dev/null -w "%{http_code}" https://leoshuaihao.github.io/ai-reading-notes/books/$SLUG/
# 期望: 200
```

**强制要求**：必须 push 并验证线上 HTTP 200，不能只 commit。

---

## 十、版本历史

| 版本 | 日期 | 变化 |
|------|------|------|
| V1 | 2026-07 初 | 初始标准 |
| V2 | 2026-07 中 | 数据同步、why-section 网格 |
| V3 | 2026-07-19 | 素材验证加严、roadmap 强制、部署加严、陷阱 8 条 |
| V3.1 | 2026-07-20 | CTA Banner 移除、chapter-preview 精简、金句 en-detail 折叠、chat.js 引入、author-bio Q 版头像 |
| V3.3 | 2026-07-20 | 去 Fisher 化：preview 最少 1 项推荐 3 项、P2 跳过条件、Block 6 升 P1、block-label 统一 div |
| V3.4 | 2026-07-20 | 暗色模式全覆盖、CSS 变量化、en-detail 可发现性提升、平板断点 |
| V3.5 | 2026-07-20 | chat-widget 策略明确、检查清单同步 |
| V4 | 2026-07-20 | **精简重写**：设计原则收敛到第 1 章，正文只描述正确形态，删掉所有"先说要 A 后来说不要 A"的矛盾叙述。V3 的 803 行压缩到约 300 行。 |

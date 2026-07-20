# 新书添加标准化流程（V3 精细化版）

> 适用场景：将一本海外投资书籍的 epub 转化为中文 AI 精读笔记页面并上线。
> 核心原则：**中文用户无需懂英文即可完整阅读**；**与其他书视觉/结构完全对齐**。
>
> ⚠️ V3 重要变化（基于 2026-07 三本书重做的经验）：
> 1. 素材验证加严：epub 可能是 HTML 伪装、mobi 提取可能破损，必须做字数阈值校验
> 2. 内容生成加严：每章输入 ≥4000 字（非 2500）、why_items/author_bio 必须书专属非模板化
> 3. 视觉一致性强制：**禁止使用 `📋 章节导航 + 链接列表`，必须用 `🗺️ 阅读路线图 + 模块卡片`**
> 4. 部署上线加严：必须 commit **且** push，必须截图验证三处（top/author/ch1），必须验证线上可访问
> 5. 生成脚本必须与标准同步：脚本的模板章节就是 V2 出错根因，修改标准时必须同步修改 `gen_books_v2.py`
>
> 🔧 **执行入口**：此文档由 `add-book` Skill（`.workbuddy/skills/add-book/SKILL.md`）强制执行。Skill 确保 AI 不会跳过任何阶段。加新书时直接说"用 add-book 流程跑 XX 书"即可。

---

## 阶段一：素材准备与验证

### 1.1 获取原始文件

- 用户提供 epub 文件（上传到 `epub/` 文件夹）
- 或提供下载链接由 AI 下载
- **记录文件路径**，后续提取脚本要用

### 1.2 验证文件格式（V3 新增，必做）

epub 可能是伪装的 HTML、mobi 可能破损。提取前**必须先验证**：

```bash
# 1. 检查文件真实类型
file epub/book-name.epub
# 期望输出包含 "Zip archive data" —— epub 本质是 zip

# 2. 如果输出是 "HTML document" 或 "ASCII text"，说明是伪装文件
#    需要改用 HTML 解析方式（正则按 "第N章 + 已知标题" 提取）

# 3. mobi 文件用 ebooklib 无法直接解析，需要先转 epub
#    calibre: ebook-convert book.mobi book.epub
```

**格式验证清单**：
- [ ] `file` 命令确认文件真实类型
- [ ] 如果是 zip/epub，用 `unzip` 验证可解压
- [ ] 如果是 HTML 伪装，记录并改用 HTML 提取方案

### 1.3 解压并提取章节

```bash
unzip book.epub -d epub_temp/book-name/
```

从解压文件中提取：

| 信息 | 来源 | 用途 |
|------|------|------|
| 目录结构 (TOC) | `toc.ncx` | 章节规划和导航 |
| 章节清单 | HTML 文件名映射 | 了解每章内容 |
| 版权信息 | `copyright.html` 或 `titlepage.html` | 确认版本/年份 |
| 全部章节正文 | 所有 chapter HTML | 内容生成（非仅前2-3章） |

### 1.4 章节质量验证（V3 新增，必做）

提取后**必须逐章验证字数**，低于阈值的章节要标记并修复：

```python
# 提取脚本必须输出每章字数统计
for i, ch in enumerate(raw_chapters):
    word_count = len(ch.get("content", ""))
    print(f"  第{i+1}章 {ch['title'][:30]}: {word_count}字")
    if word_count < 500:
        print(f"  ⚠️ 第{i+1}章字数过少，可能提取破损，需检查")
```

**字数阈值**：
- ✅ 正常：≥ 1000 字/章
- ⚠️ 警告：500-1000 字/章（需人工确认内容完整性）
- ❌ 错误：< 500 字/章（必须重新提取，禁止直接送 AI）

### 1.5 章节数一致性校验（V3 新增，必做）

**三处章节数必须完全一致**，任何不一致都必须修复后才能进入下一阶段：

| 数据源 | 位置 | 说明 |
|--------|------|------|
| epub TOC | `toc.ncx` | 原始目录 |
| 提取结果 | 提取脚本输出的章节数 | 实际提取到的 |
| BOOK_META | `assets/js/data.js` 中 `chapters` 字段 | 首页配置 |

```bash
# 校验脚本
# 1. 统计 epub 提取的章节数
python3 -c "import json; print(len(json.load(open('/tmp/book_chapters/book.json'))))"

# 2. 统计 BOOK_META 中的章节数
grep -A1 "'book-slug'" assets/js/data.js | grep chapters

# 3. 两者必须相等，否则必须修复
```

### 1.6 版本确认

- 检查是否最新版本
- 如果用户提供的不是最新版，告知差异，等用户确认

### 1.7 确认清单（与用户对齐）

输出以下内容等用户确认后再生成：

```
📖 书名（中文）：_______
👤 作者（中文）：_______
📅 版本/年份：_______
📑 章节数：_______章（与 epub TOC 一致 ✅）
🏷️ 标签：_______（3-5个）
⭐ 豆瓣评分：_______（选填）
📄 文件格式验证：_______（epub/mobi/HTML伪装）
✅ 章节字数验证：全部 ≥1000 字（或已标注异常章节）
```

---

## 阶段二：内容生成

### 2.1 生成 HTML 文件

**文件位置**：`books/{book-slug}/index.html`

**页面结构**（固定顺序，V3 强制）：

```
1. Meta 标签（SEO + Schema.org 结构化数据）
2. 顶部导航栏 <nav class="top-nav">
3. 书籍 Hero 卡片 <section class="book-hero" id="overview">
4. 为什么值得精读 <section> → .why-section（2×2 网格，4个书专属理由）
5. 作者简介 <section class="author-bio">（含头像 + 详细生平 + bio-highlight 标签）
6. 核心框架图（如果书有框架，如格雷厄姆金字塔）
7. 核心原则速览（如果书有原则清单）
8. 阅读路线图 <section> → .roadmap + .part-card（V3 强制，禁止 chapter-nav）
9. 阅读进度条 <div class="progress-section">
10. 章节卡片 <article class="chapter-card" id="chN"> ... </article>
11. Footer
12. 回到顶部按钮 <button class="back-to-top">
13. 引用 JS <script src="../../assets/js/data.js"> + <script src="../../assets/js/app.js"> + <script src="../../assets/js/chat.js">
```

### 2.2 阅读路线图规范（V3 强制，禁止偏离）

**必须使用** `🗺️ 阅读路线图 + 模块卡片` 模式，**严禁使用** `📋 章节导航 + 链接列表`：

```html
<!-- ✅ 正确：阅读路线图 + 模块卡片 -->
<section aria-labelledby="roadmap-title">
  <h2 class="section-title" id="roadmap"><span class="emoji">🗺️</span> 阅读路线图</h2>
  <p style="color:var(--text-secondary);margin-bottom:20px;font-size:14px;">全书N章分为M个模块的导读说明（1-2句话）。</p>
  <div class="roadmap" id="roadmap-modules">
    <div class="part-card current">
      <div class="part-num">📖 模块1</div>
      <h3 class="part-title">模块名称</h3>
      <div class="part-pages">ChX-Y · 模块主题简述</div>
    </div>
    <!-- 3-5个模块 -->
  </div>
</section>

<!-- ❌ 错误：章节导航 + 链接列表（V3 禁止） -->
<section class="chapter-nav" id="roadmap">
  <h2><span class="emoji">📋</span> 章节导航</h2>
  <div class="nav-links">
    <a href="#ch1">第1章 · ...</a>
    ...
  </div>
</section>
```

**模块分组规则**：
- 章节数 ≤ 15：分 3-4 个模块
- 章节数 16-30：分 4-5 个模块
- 章节数 > 30：分 5-6 个模块
- 核心模块标记 `⭐核心` 或 `⭐必读`
- 每个模块的 `part-pages` 必须说明章节范围和主题

### 2.3 每个章节卡片结构（最多 9 个 block，P0 必选 + P1 推荐 + P2 按需）

**核心原则**：P0（定位/概念/要点）每章必须有；P1（金句/文化背景/中国市场/思考题）尽量有；P2（反方/术语）严格按跳过条件判断，不适用就跳过，禁止灌水。

```html
<article class="chapter-card" id="chN" aria-labelledby="chN-title">
  <div class="ch-header">
    <div class="ch-num">N</div>
    <div>
      <h2 class="ch-title" id="chN-title">第N章 · 章节标题</h2>
    </div>
    <!-- 预览信息（最少1项，推荐3项） -->
    <div class="chapter-preview">
      <div class="preview-item"><span class="preview-label">🔑 关键概念：</span><span class="preview-text">概念名</span></div>
      <div class="preview-item"><span class="preview-label">🎯 核心问题：</span><span class="preview-text">一句话核心问题</span></div>
      <div class="preview-item"><span class="preview-label">💡 一句话：</span><span class="preview-text">一句话总结</span></div>
    </div>
  </div>

  <!-- Block 1: 章节定位（P0 必选） -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:var(--gold)"></span> 章节定位</div>
    <div class="block-content"><p>本章在全书中解决什么问题（40-80字）</p></div>
  </div>

  <!-- Block 2: 金句（P1 推荐，有精彩原文时添加） -->
  <div class="gold-quote">
    <details class="en-detail"><summary>📖 原文（点击展开）</summary><div class="en">英文原文...</div></details>
    <div class="zh">「中文翻译」</div>
    <div class="why">💬 解读（为什么这句重要）</div>
  </div>

  <!-- Block 3: 核心概念深度解读（P0 必选） -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:var(--blue)"></span> 核心概念深度解读</div>
    <div class="concept-box">
      <h3 class="concept-name">概念名</h3>
      <div class="concept-body"><p>200-350字深度解读，基于原文，不要空泛</p></div>
    </div>
  </div>

  <!-- Block 4: 文化背景补充（P1 推荐） -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:var(--green)"></span> 🌍 文化背景补充</div>
    <div class="context-box"><p>涉及美国金融制度/历史背景时填写</p></div>
  </div>

  <!-- Block 5: 反方观点（P2 可选） -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:#b33"></span> ⚔️ 反方观点</div>
    <div class="counter-box"><p>反对者观点及理由</p></div>
  </div>

  <!-- Block 6: 中国市场关联（P1 推荐，默认尽量做） -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:var(--china)"></span> 🇨🇳 中国市场关联</div>
    <div class="china-box"><p>如何应用于A股或中国投资实践</p></div>
  </div>

  <!-- Block 7: 术语词典（P2 可选） -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:var(--purple)"></span> 📊 关键术语词典</div>
    <table class="term-table">
      <tr><td><strong>English Term</strong></td><td class="zh">中文翻译</td><td>解读（10-20字）</td></tr>
    </table>
  </div>

  <!-- Block 8: 本章要点总结（P0 必选） -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:var(--accent)"></span> 💡 本章要点总结</div>
    <ul class="takeaway-list"><li>要点1（15-30字，具体可执行）</li><li>要点2</li><li>要点3</li></ul>
  </div>

  <!-- Block 9: 思考题（P1 推荐，每章至少1题） -->
  <div class="block">
    <div class="block-label"><span class="dot" style="background:var(--purple)"></span> 🤔 思考题</div>
    <div class="exercise-box">
      <p class="q">思考题（20-40字，引导读者联系实际）</p>
      <p class="hint">💡 提示：...</p>
    </div>
  </div>
</article>
```

**chapter-preview 数量规则**：
- 最少 1 项（`🔑 关键概念`，必填）
- 推荐 3 项（加 `🎯 核心问题` 和 `💡 一句话`），尤其章节数 >15 的书
- 导言章可仅保留 1 项

### 2.4 内容块优先级

| 优先级 | Block | 何时必选 | 何时可选/跳过 |
|--------|-------|----------|---------------|
| P0 必选 | Block 1 章节定位 | 每章 | — |
| P0 必选 | Block 3 核心概念 | 每章 | — |
| P0 必选 | Block 8 要点总结 | 每章 | — |
| P1 推荐 | Block 2 金句 | 有精彩原文时 | 叙事型章节或无精彩原文可跳过 |
| P1 推荐 | Block 4 文化背景 | 涉及美国金融制度/历史 | 通用概念可跳过 |
| P1 推荐 | Block 9 思考题 | 每章至少1题 | — |
| P1 推荐 | Block 6 中国市场 | 原则可对标A股时 | 完全不可对标（纯美国制度/哲学类）才跳过，默认尽量做 |
| P2 可选 | Block 5 反方观点 | 概念有争议时 | 共识性内容跳过 |
| P2 可选 | Block 7 术语词典 | 本章有≥2个新术语时 | 术语不足2个跳过 |

### 2.5 why-section 规范（V3 强制）

**必须 2×2 网格**，4 个理由必须是**书专属内容**（非模板化套话）：

```html
<section aria-labelledby="why-title">
  <h2 class="section-title" id="why-title"><span class="emoji">💡</span> 为什么这本书值得精读？</h2>
  <div class="why-section">
    <div class="why-item">
      <div class="why-icon">🏆</div>  <!-- 书专属图标 -->
      <h3 class="why-title">书专属理由标题</h3>  <!-- 不能是通用标题如"经典之作" -->
      <div class="why-desc">具体理由（80-150字，含具体数据/案例）</div>
    </div>
    <!-- 共4个，2×2排列 -->
  </div>
</section>
```

**反面案例**（禁止）：
- ❌ "经典之作，必读" —— 空泛
- ❌ "作者很厉害" —— 无具体信息
- ✅ "全球销量4000万册的财商启蒙" —— 有数据
- ✅ "巴菲特19岁读此书，至今认为是最好的投资书籍" —— 有具体案例

### 2.6 author-bio 规范（V3 强制）

```html
<section class="author-bio" aria-labelledby="author-name">
  <!-- 头像：标准方案为缩写+渐变；有条件的可替换为Q版卡通图 -->
  <div class="avatar" aria-hidden="true" style="background: linear-gradient(135deg, #色1, #色2);">AB</div>
  <div class="bio-content">
    <h2 id="author-name">作者中文名（生卒年）</h2>
    <p>生平第一段：出生、教育、主要成就</p>
    <p>生平第二段：代表作、核心贡献、行业影响</p>
    <p>生平第三段（可选）：与中国关联、个人哲学</p>
    <div>
      <span class="bio-highlight">标签1</span>
      <span class="bio-highlight">标签2</span>
      <span class="bio-highlight">标签3</span>
    </div>
  </div>
</section>
```

**要求**：
- 生平至少 2 段，每段 80-150 字
- 必须含 bio-highlight 标签（3-5个）
- 头像标准方案为作者姓名缩写（2个大写字母）+ 渐变背景；鼓励使用 Q版卡通图（`/assets/images/authors/{author-slug}.png`）替代

---

## 阶段三：生成脚本规范（V3 新增）

使用 `gen_books_v2.py`（或更新版本）生成时，必须遵守以下规范。

### 3.1 脚本配置项（BOOKS 字典）

每本书必须在脚本的 `BOOKS` 字典中完整配置：

```python
BOOKS = {
    "book-slug": {
        # 基本信息
        "title": "中文书名",
        "author": "中文作者名",
        "author_en": "English Name",
        "year": "出版年份",
        "domain_cn": "域名称",  # 如"心性与哲学"
        "domain_key": "mind",   # mind/value/cycle/uncertainty/business
        "chapter_file": "book.json",  # /tmp/book_chapters/ 下的章节文件

        # 视觉配置
        "cover_gradient": "linear-gradient(135deg, #色1 0%, #色2 50%, #色3 100%)",
        "cover_text": "English\nTitle",  # 封面显示的英文标题
        "author_initials": "AB",  # 作者缩写

        # 内容配置（V3 强制：必须书专属，非模板）
        "subtitle": "副标题",
        "desc": "100-200字书籍简介",
        "why_items": [  # 4个，每个(图标, 标题, 描述)，必须书专属
            ("🏆", "具体理由标题", "80-150字具体理由含数据/案例"),
            # ... 共4个
        ],
        "author_bio": "200-400字作者生平，含具体成就",
        "author_tags": ["标签1", "标签2", "标签3"],  # V3 新增：bio-highlight 标签
        "author_avatar": "",  # V3 新增：Q版卡通头像路径（如 "philip-fisher.png"），空字符串用缩写+渐变回落

        # 阅读路线图配置（V3 新增，必填）
        "roadmap_modules": [
            {"num": "模块1", "title": "模块名称", "pages": "Ch1-5 · 主题简述"},
            # 3-6个模块
        ],
        "roadmap_intro": "全书N章分为M个模块的导读说明。",
    },
}
```

### 3.2 API 调用规范

```python
# 每章输入字数 ≥ 4000 字（V3 强制，V2 是 2500 字导致内容浅）
content_snippet = content[:4000]

# Prompt 必须要求 AI 输出严格 JSON
SYSTEM_PROMPT = """你是专业投资书籍精读编辑...
   1. 内容必须基于原文，不得编造
   2. 分析要深入具体，不要空泛套话
   3. 所有输出必须是中文
   4. 输出必须是严格的JSON格式"""

# API 参数
{
    "model": "deepseek-chat",
    "messages": [...],
    "temperature": 0.3,
    "max_tokens": 4000
}
```

### 3.3 增量保存与错误处理

```python
# 1. 增量保存到 /tmp/book_progress/{slug}_progress.json
#    每 5 章保存一次，避免中途失败全部重来
PROGRESS_DIR = "/tmp/book_progress"

# 2. 重新运行时自动加载已有进度，只生成缺失章节
if os.path.exists(progress_file):
    saved = json.load(open(progress_file))
    for i, ch in enumerate(saved):
        if i < total_chapters:
            chapters_data[i] = ch

# 3. --build-only 模式：只从已保存进度重建 HTML，不调 API
#    用于修复 HTML 模板问题（如 chapter-nav → roadmap）
python gen_books_v2.py --build-only book-slug
```

### 3.4 脚本生成 HTML 模板必须符合标准（V3 重点）

**⚠️ 脚本的 `build_book_page()` 函数就是 V2 出错的根因**——它生成了 `📋 章节导航 + 链接列表` 而非 `🗺️ 阅读路线图`。修改标准时必须同步修改脚本模板：

```python
# ❌ V2 错误模板（gen_books_v2.py 第362-367行）
'''<!-- CHAPTER NAV -->
<section class="chapter-nav" id="roadmap">
  <h2><span class="emoji">📋</span> 章节导航</h2>
  <div class="nav-links">{nav_links}</div>
</section>'''

# ✅ V3 正确模板
'''<!-- ROADMAP -->
<section aria-labelledby="roadmap-title">
  <h2 class="section-title" id="roadmap"><span class="emoji">🗺️</span> 阅读路线图</h2>
  <p style="color:var(--text-secondary);margin-bottom:20px;font-size:14px;">{roadmap_intro}</p>
  <div class="roadmap" id="roadmap-modules">
    {roadmap_cards}
  </div>
</section>'''
```

**规则**：任何对 `ADD_BOOK_STANDARD.md` 阶段二页面结构的修改，**必须同步检查 `gen_books_v2.py` 的 `build_book_page()` 和 `build_chapter_html()` 函数**，确保脚本模板与标准一致。

### 3.5 并发生成

```python
# 3 并发，避免 API 限流
with ThreadPoolExecutor(max_workers=3) as executor:
    futures = {executor.submit(gen_task, t): t for t in tasks}
```

---

## 阶段四：中文化检查

### 4.1 保留项（允许出现英文）

| 类别 | 示例 | 说明 |
|------|------|------|
| 专业缩写 | ROE, EPS, PE, PB, DCF, alpha, beta | 投资术语通用缩写 |
| 公司缩写 | GEICO, IBM | 已知公司的通用缩写 |
| en-detail 原文 | 金句原文（折叠） | 用户需点击才看到 |
| Schema.org | JSON-LD 结构化数据 | 搜索引擎用 |
| 封面英文 | cover-text 中的英文书名 | 装饰用途 |

### 4.2 必须翻译项

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

### 4.3 自动检查脚本

```bash
# 检查残留英文（排除 en-detail 和缩写）
grep -nP '[A-Za-z]{4,}' books/new-book/index.html | \
  grep -v 'en-detail' | grep -v 'ROE\|EPS\|PE\|PB\|DCF\|GEICO\|IBM'
```

---

## 阶段五：导航栏配置

### 5.1 导航格式（强制统一）

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

### 5.2 无需手动配置

导航栏的下拉菜单、当前章节高亮、侧边栏面板均由 `app.js` 自动生成，HTML 中只需保留标准链接结构即可。

---

## 阶段六：修行首页与书架数据更新

编辑 `index.html` 中的内联 JS 数据配置（两个位置）：

### 6.1 更新 BOOK_META（在"今日精读"脚本附近）

```javascript
var BOOK_META = {
  // ... 已有条目 ...
  'new-book-slug': { title: '中文书名', chapters: 15 }  // chapters 必须与 epub 提取数一致
};
```

### 6.2 更新 DOMAINS（在"五域修行核心逻辑"脚本中）

确定新书属于哪个域，添加对应条目：

```javascript
{
  key: 'business', // 或 valuation/cycle/mind/uncertainty
  books: [
    // ... 已有条目 ...
    { slug: 'new-book-slug', lv: 2 }  // Lv.1-Lv.4 难度
  ]
}
```

如果需要跨山连接，在对应域的 `cross` 数组中添加引用。

### 6.3 更新 bookshelf.html

添加书籍卡片：

```html
<div class="book-card">
  <div class="card-cover new-book">  <!-- CSS 类名，需要在 <style> 中定义渐变 -->
    <span class="status-badge available">已上线</span>
    <div class="cover-text">中文书名</div>
  </div>
  <div class="card-body">
    <h3>中文书名</h3>
    <div class="author">中文作者名 · 年份</div>
    <div class="desc">一段中文简介（100-150字），包含核心贡献和独特价值</div>
    <div class="tags">
      <span class="tag">标签1</span>
      <span class="tag">标签2</span>
      <span class="tag">X章精读</span>
    </div>
    <a class="card-btn primary" href="books/new-book-slug/">进入精读 →</a>
  </div>
</div>
```

注意：`card-cover` 的 CSS 类需要在 bookshelf.html 的 `<style>` 中添加对应渐变背景。

### 6.4 更新 bookshelf.html 统计数据

```html
<span class="stats-line">📚 已上线 N 本经典 · M 个精读章节</span>
```

---

## 阶段七：视觉一致性验证（V3 新增，必做）

### 7.1 截图验证三处

生成完成后，**必须用 Playwright 截图验证**三个关键位置：

```javascript
// 截图脚本模板
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:8000/books/book-slug/', { waitUntil: 'networkidle' });

  // 1. 顶部（book-hero + why-section）
  await page.screenshot({ path: '/tmp/verify_top.png' });

  // 2. 作者简介 + 阅读路线图（确认是 🗺️ 模块卡片，不是 📋 链接列表）
  await page.evaluate(() => document.getElementById('roadmap').scrollIntoView());
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/verify_author_roadmap.png' });

  // 3. 第1章内容（确认9个block完整）
  await page.evaluate(() => document.getElementById('ch1').scrollIntoView());
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/verify_ch1.png' });

  await browser.close();
})();
```

### 7.2 视觉检查清单

截图后逐项确认：
- [ ] book-hero 封面渐变正常、标题/作者/标签显示完整
- [ ] why-section 是 2×2 网格、4个理由非空泛套话
- [ ] author-bio 有头像、生平至少2段、有 bio-highlight 标签
- [ ] **阅读路线图标题是 `🗺️ 阅读路线图`（不是 `📋 章节导航`）**
- [ ] **roadmap 区域是模块卡片（.part-card），不是链接列表（.nav-links）**
- [ ] 第1章 chapter-preview 最少1项（推荐3项）
- [ ] 第1章至少有 Block 1/3/8（定位/概念/要点）
- [ ] 金句的 en-detail 原文折叠正常（有原文时必选）

### 7.3 与其他书对比验证

```bash
# 截图一本已有书做对比
# 确认新书与已有书在 roadmap 区域结构完全一致
```

---

## 阶段八：部署上线（V3 加严）

### 8.1 提交并推送（V3 强制：commit AND push）

```bash
cd /Users/lee/WorkSpace/WorkBuddy/ai-reading-notes
git add books/new-book/ index.html bookshelf.html assets/js/data.js
git commit -m "feat: 添加《书名》精读笔记（X章）"
git push  # ⚠️ V3 强制：必须 push，不能只 commit
```

**⚠️ V3 教训**：曾发生"改了吗？还是错的"——改动只 commit 在本地，未 push 到 GitHub Pages，用户在线上看不到。**必须 push 并验证线上可访问**。

### 8.2 验证线上可访问（V3 新增，必做）

```bash
# 等待 GitHub Pages CDN 刷新（1-2分钟）
sleep 60

# 验证线上页面可访问
curl -s -o /dev/null -w "%{http_code}" https://leoshuaihao.github.io/ai-reading-notes/books/new-book/
# 期望 200

# 如果不是 200，检查 GitHub Actions 部署状态
```

### 8.3 网络重试机制

如果 `git push` 失败（Connection reset by peer 等），**必须重试**，不能只 commit 不 push：

```bash
# 最多重试 5 次，每次间隔递增
for i in 1 2 3 4 5; do
  git push && break
  echo "Push failed, retry $i in ${i}0s..."
  sleep ${i}0
done
```

---

## 完整检查清单

### 阶段一：素材验证
- [ ] `file` 命令验证文件真实类型
- [ ] 章节字数全部 ≥ 500 字（异常章节已修复）
- [ ] 章节数三处一致（epub TOC = 提取结果 = BOOK_META）
- [ ] 与用户确认书名/作者/版本/章节数

### 阶段二：内容生成
- [ ] 页面结构 14 项按固定顺序排列
- [ ] **阅读路线图用 `🗺️` + `.roadmap` + `.part-card`（禁止 `📋` + `.chapter-nav`）**
- [ ] 每个章节卡片 9 个 block 按固定顺序
- [ ] why-section 是 2×2 网格、4个书专属理由
- [ ] author-bio 有头像 + 2段以上生平 + bio-highlight 标签
- [ ] chapter-preview 预览信息完整（最少1项关键概念，推荐3项）

### 阶段三：生成脚本（如使用）
- [ ] BOOKS 字典配置完整（含 roadmap_modules 和 roadmap_intro）
- [ ] 每章输入 ≥ 4000 字
- [ ] 增量保存到 /tmp/book_progress/
- [ ] **脚本 build_book_page() 模板与标准一致（roadmap 非 chapter-nav）**

### 阶段四：中文化
- [ ] 书名/作者/出版社全部中文化
- [ ] meta 标签和 og 标签中文化
- [ ] Schema.org 结构化数据中文化
- [ ] en-detail 原文已折叠
- [ ] 残留英文检查脚本通过

### 阶段五：导航
- [ ] 导航栏格式正确（概览→路线图→导言→章节）
- [ ] 所有章节标题统一为"第N章 · 标题"格式

### 阶段六：数据同步
- [ ] index.html 中 BOOK_META 已添加新书（chapters 数与 epub 一致）
- [ ] index.html 中 DOMAINS 已添加新书到对应域
- [ ] bookshelf.html 中已添加书籍卡片
- [ ] bookshelf.html 中统计数字已更新
- [ ] 新书封面 CSS 渐变类已添加到 bookshelf.html 的 `<style>` 中

### 阶段七：视觉验证
- [ ] 截图验证三处（top / author+roadmap / ch1）
- [ ] **roadmap 区域确认是模块卡片**
- [ ] why-section 确认是 2×2 网格
- [ ] 第1章 9 个 block 完整
- [ ] 与其他书对比结构一致

### 阶段八：部署
- [ ] `git commit` 成功
- [ ] **`git push` 成功（不能只 commit）**
- [ ] 线上页面 HTTP 200 可访问
- [ ] 线上页面显示正常

---

## 常见陷阱（Lessons Learned）

### 陷阱 1：epub 文件是 HTML 伪装

**现象**：`file book.epub` 输出 "HTML document"，用 ebooklib 解析失败或只提取到1章。

**解决**：改用正则按"第N章 + 已知标题"从 HTML 直接提取。

**案例**：random-walk 的 .epub 实际是单个 HTML 文件，用正则按"第N章+已知标题"精确匹配提取 15 章（7739-23625字/章）。

### 陷阱 2：mobi 提取破损

**现象**：mobi 转 epub 后，多数章节内容仅 100-200 字。

**解决**：检查转换质量，或直接从原始 epub 提取（如果有）。

### 陷阱 3：章节数不一致

**现象**：BOOK_META 写 38 章，实际只生成 15 章（脚本 `raw_chapters[:15]` 截断）。

**解决**：阶段一强制三处校验；脚本禁止用切片截断章节。

### 陷阱 4：内容浅/套话

**现象**：AI 生成的核心概念解读只有"本章讲述了..."的空泛描述。

**根因**：每章只给 AI 2500 字输入，AI 无法理解章节深度。

**解决**：每章输入 ≥ 4000 字；prompt 明确要求"200-350字深度解读，基于原文，不要空泛"。

### 陷阱 5：生成脚本模板与标准不一致

**现象**：标准要求 `🗺️ 阅读路线图`，但脚本 `build_book_page()` 生成的是 `📋 章节导航`。

**根因**：修改标准时未同步修改脚本。

**解决**：V3 强制规则——修改 `ADD_BOOK_STANDARD.md` 阶段二时，必须同步检查 `gen_books_v2.py` 的模板函数。

### 陷阱 6：改动未推送

**现象**：用户反馈"你改了吗？我到页面看还是错的"。

**根因**：只 `git commit`，未 `git push`，GitHub Pages 未更新。

**解决**：V3 强制规则——必须 `git push` 并验证线上 HTTP 200。

### 陷阱 7：why-section 布局失衡

**现象**：左侧只有大标题，右侧4个卡片垂直堆叠，不协调。

**解决**：why-section 必须 2×2 网格，标题在顶部。

### 陷阱 8：金字塔 SVG 模糊

**现象**：首页金字塔文字看不清。

**解决**：字体 ≥14px + font-weight 900 + textGlow 滤镜（三层发光）。

---

## 版本历史

| 版本 | 日期 | 主要变化 |
|------|------|----------|
| V1 | 2026-07 初 | 初始标准，基础流程 |
| V2 | 2026-07 中 | 增加 BOOK_META/DOMAINS 数据同步、why-section 2×2 网格 |
| V3 | 2026-07-19 | 精细化：素材验证（格式/字数/一致性）、内容生成（4000字/书专属）、视觉强制（roadmap 非 chapter-nav）、脚本规范、部署加严（必须push+线上验证）、常见陷阱8条 |
| V3.1 | 2026-07-20 | UI标准化同步：CTA Banner 移除、chapter-preview 3→1项（仅关键概念）、金句强制 en-detail 原文折叠、页面引入 chat.js、author-bio 支持 Q版卡通头像 + bio-highlight 标签、BOOKS 配置新增 author_tags/author_avatar |
| V3.3 | 2026-07-20 | 去 Fisher 化：chapter-preview 最少1项推荐3项；9-block 加 P2 跳过条件；Block 6（中国市场）P2→P1 默认尽量做；Q版头像降级为"鼓励非必须"；金句统一 P1；block-label 统一 `<div>` |
| V3.4 | 2026-07-20 | 终审修复：暗色模式全量覆盖 + 30处组件颜色变量化 + en-detail 可发现性提升（13px+▸图标）+ .section-title 合并去重 + 平板断点 + color-mix fallback |

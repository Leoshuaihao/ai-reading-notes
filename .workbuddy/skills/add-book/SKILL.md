---
name: add-book
description: >
  新书添加入口。当用户要生成新书的精读笔记页面、将 epub 转化为 AI 精读笔记并上线时触发。
  关键词：加新书、添加新书、生成新书、跑流水线、跑流程、生成精读页面、新书上线。
  此技能强制 AI 严格按照 ADD_BOOK_STANDARD.md 的 8 个阶段逐阶段执行，禁止跳步。
agent_created: true
---

# 新书添加流水线（强制门控）

## 概述

此技能将 `ADD_BOOK_STANDARD.md` 编码为强制执行的工作流。每当用户请求生成新书，必须按阶段序号依次执行，
**每个阶段有门控检查点，门控不通过不得进入下一阶段**。

## 触发条件

用户请求包含以下意图之一时触发：
- "加新书"、"添加新书"、"生成新书"
- "跑流水线"、"跑流程"、"按标准生成"
- "生成 XX 的精读页面"、"新书上线"

## 项目上下文

- 项目根目录：`/Users/lee/WorkSpace/WorkBuddy/ai-reading-notes`
- 标准文档：`ADD_BOOK_STANDARD.md`（V3.1）
- 生成脚本：`gen_books_v2.py`
- 章节缓存：`/tmp/book_chapters/`（epub 提取后的 JSON）
- 进度保存：`/tmp/book_progress/`
- 输出目录：`books/{slug}/index.html`
- 线上地址：`https://leoshuaihao.github.io/ai-reading-notes/`

## 核心规则（最高优先级）

**规则 0：读取标准文档。** 在开始任何阶段之前，必须先 `Read ADD_BOOK_STANDARD.md` 全文。

**规则 1：逐阶段执行，禁止跳过。** 必须从阶段一到阶段八依次执行，每个阶段完成门控检查后才能进入下一阶段。
即使用户说"测试版就不用验证了"，也必须走完阶段一和阶段四（这两个是内容质量的最低防线）。

**规则 2：每阶段结束时向用户汇报门控状态。** 格式为：
```
✅ 阶段X 门控通过（N/N 项全部完成）
⚠️ 阶段X 门控通过（N/M 项完成，X项已确认跳过）
❌ 阶段X 门控未通过（原因：...）
```

**规则 3：门控不通过时必须先修复再继续。** 不能"先跳过后面再回来修"。

## 八阶段流水线

### 阶段一：素材准备与验证【强制，不可跳过】

**门控项（6 项）：**
- [ ] 1.1 用户提供 epub 文件或下载链接
- [ ] 1.2 `file` 命令验证 epub 真实类型（必须是 Zip archive）
- [ ] 1.3 解压并提取全部章节到 `/tmp/book_chapters/{slug}.json`
- [ ] 1.4 逐章打印字数统计，标记 < 500 字的异常章节
- [ ] 1.5 校验 epub TOC 章节数 = 提取章节数
- [ ] 1.7 向用户确认：书名/作者/版本/章节数/标签/豆瓣评分/文件格式

**门控通过条件：** 全部 6 项完成，用户确认无误。

**如果已有缓存章节文件（/tmp/book_chapters/ 下已有）：**
- 仍需做 1.2、1.4、1.5（基于缓存文件做字数验证和一致性检查）
- 仍需做 1.7（向用户确认，即使之前生成过）

### 阶段二：内容生成【核心】

1. 在 `gen_books_v2.py` 的 `BOOKS` 字典中添加书籍配置（含所有必填字段）
2. 运行 `python gen_books_v2.py {slug}` 调 DeepSeek API 生成章节 JSON
3. 脚本自动：增量保存进度、3 并发、构建 HTML

**门控项（8 项）：**
- [ ] 页面结构 13 项按固定顺序排列
- [ ] 🗺️ 阅读路线图 + .part-card（非 📋 + .chapter-nav）
- [ ] chapter-preview 1 项（仅关键概念）
- [ ] 金句有 `<details class="en-detail">` 折叠（有原文时）
- [ ] block-label 统一用 div（非 h3）
- [ ] CTA Banner 已移除
- [ ] chat.js 已引入
- [ ] author-bio 有 Q版头像（或 onerror 回落）+ bio-highlight 标签

**门控通过条件：** 全部 8 项通过 grep 检查。

### 阶段三：生成脚本参数校验【生成后】

- [ ] BOOKS 字典配置完整（含 roadmap_modules、roadmap_intro、author_tags、author_avatar）
- [ ] 每章输入 ≥ 4000 字
- [ ] temperature = 0.3
- [ ] 增量保存到 /tmp/book_progress/

### 阶段四：中文化检查【强制，不可跳过】

**门控项（5 项）：**
- [ ] 书名/作者/出版社全部中文化
- [ ] meta description 和 og 标签中文化
- [ ] Schema.org 结构化数据中文化
- [ ] en-detail 原文已折叠
- [ ] 执行英文残留扫描：

```bash
grep -nP '[A-Za-z]{4,}' books/{slug}/index.html | \
  grep -v 'en-detail' | grep -v 'ROE\|EPS\|PE\|PB\|DCF\|GEICO\|IBM\|SVG\|CSS\|JSON\|HTML\|http\|https\|url\|aria\|var\|span\|div\|nav\|img\|src\|alt\|href\|class\|style\|data\|true\|false\|null\|function\|return\|document\|window\|querySelector\|getElementById\|addEventListener\|toggle\|scroll\|preventDefault\|stopPropagation\|forEach\|textContent\|innerHTML\|classList\|parentElement\|onclick\|onerror\|viewport\|width\|height\|button\|input\|type\|text\|placeholder\|label\|name\|role\|tabindex\|chat\|Chat\|sendChat\|toggleChat\|supabase\|localStorage\|getItem\|setItem'
```

**门控通过条件：** 残留扫描结果只有专业缩写和 en-detail 内的英文，无其他英文残留。

### 阶段五：导航栏配置

- [ ] 导航栏格式正确（概览→路线图→导言→章节）
- [ ] 所有章节标题统一为"第N章 · 标题"格式

### 阶段六：首页与书架数据更新

- [ ] `index.html` 中 BOOK_META/BOOKS 已添加新书
- [ ] `bookshelf.html` 中已添加书籍卡片

### 阶段七：视觉验证

- [ ] 截图验证三处（top / author+roadmap / ch1）
- [ ] roadmap 确认是模块卡片
- [ ] 第1章 P0 block（定位/概念/要点）完整
- [ ] 与其他书对比结构一致

### 阶段八：部署上线

- [ ] `git add` → `git commit` → `git push`
- [ ] 验证线上 HTTP 200：`curl -s -o /dev/null -w "%{http_code}" https://leoshuaihao.github.io/ai-reading-notes/books/{slug}/`

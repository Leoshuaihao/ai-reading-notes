# 中文化规范文档 · AI 精读笔记平台

> 本文档定义所有面向用户文字的中文化规则。内容生成后、上线前，必须逐条检查。

---

## 1. 核心原则

> **用户是零英文基础的中文读者。任何英文单词都是阅读障碍。**

所有面向用户可见的文字必须为中文化，唯一的例外是纯缩写。

---

## 2. 允许保留的英文

### 2.1 纯缩写（全部大写、无实际英文单词含义）

| 缩写 | 全称 | 保留原因 |
|------|------|---------|
| ROE | Return on Equity | 中文读者通用认知 |
| EPS | Earnings Per Share | 中文读者通用认知 |
| PE / P/E | Price to Earnings | 中文读者通用认知 |
| DCF | Discounted Cash Flow | 中文读者通用认知 |
| PB / P/B | Price to Book | 中文读者通用认知 |
| ETF | Exchange Traded Fund | 中文读者通用认知 |
| IPO | Initial Public Offering | 中文读者通用认知 |
| CEO | Chief Executive Officer | 中���读者通用认知 |
| CFO | Chief Financial Officer | 中文读者通用认知 |
| GDP | Gross Domestic Product | 中文读者通用认知 |

### 2.2 判断标准

保留当且仅当满足以下**全部**条件：
1. 全部大写字母
2. 中文财经媒体中普遍直接使用（不翻译）
3. 目标读者（投资爱好者）无需解释就能理解

### 2.3 边界案例

以下**必须翻译**：

| 英文 | 错误 | 正确 |
|------|------|------|
| value investing | value investing | 价值投资 |
| margin of safety | margin of safety | 安全边际 |
| moat | moat | 护城河 |
| Mr. Market | Mr. Market | 市场先生 |
| circle of competence | circle of competence | 能力圈 |
| intrinsic value | intrinsic value | 内在价值 |

---

## 3. 必须翻译的内容

### 3.1 书籍信息

- **书名**：必须翻译为中文（如 "The Intelligent Investor" → "聪明的投资者"）
- **作者名**：必须翻译为中文（如 "Benjamin Graham" → "本杰明·格雷厄姆"）
- **出版社**：翻译（如 "Harper Business" → "哈珀商业出版社"）
- **书籍描述/简介**：全文翻译

### 3.2 章节内容

- 所有 `.block-label`（块标签）：翻译
- 所有 `.block-content`（块正文）：翻译
- 所有 `.gold-quote .zh`（金句中文翻译）：自然存在
- 所有 `.gold-quote .why`（入选理由）：翻译
- 所有 `.concept-box .concept-body`（概念解读）：翻译
- 所有 `.context-box`（背景说明）：翻译
- 所有 `.counter-box`（反方观点）：翻译
- 所有 `.china-box`（中国市场关联）：翻译
- 所有 `.exercise-box`（思考题）：翻译
- 所有 `.term-table .zh`（术语中文）：翻译
- 所有 `.takeaway-list`（要点清单）：翻译

### 3.3 页面元信息

- `<title>`：翻译
- `<meta name="description">`：翻译
- 结构化数据 `ld+json`：翻译
- 导航栏链接文字：翻译
- Hero 区域所有文字：翻译
- Footer 所有文字：翻译

### 3.4 书架首页

- 书籍卡片标题、作者、简介：翻译
- 统计数字描述：翻译
- Hero 标语：翻译
- 所有按钮文字：翻译

---

## 4. 英文原文的保留策略

### 4.1 金句（gold-quote）

金句**保留英文原文** + 中文翻译：

```html
<div class="gold-quote">
  <div class="en">"The stock market is filled with individuals who know the price
  of everything, but the value of nothing."</div>
  <div class="zh">"股市里到处都是知道所有东西价格、却对价值一无所知的人。"</div>
  <div class="why">入选理由：这句话精准概括了...</div>
</div>
```

### 4.2 概念框（concept-box）

概念名保留英文原文作为副标题：

```html
<div class="concept-box">
  <div class="concept-name">安全边际</div>
  <div class="concept-en">Margin of Safety</div>
  <div class="concept-body">安全边际是格雷厄姆提出的...</div>
</div>
```

### 4.3 术语表（term-table）

术语保留英文原文：

```html
<tr>
  <td class="en">Margin of Safety</td>
  <td class="zh">安全边际</td>
  <td>以远低于内在价值的价格买入...</td>
</tr>
```

### 4.4 折叠英文原文（en-detail）

较长的英文原文段落使用 `<details>` 折叠：

```html
<details class="en-detail">
  <summary>📖 英文原文</summary>
  <div class="en">"..."</div>
</details>
```

---

## 5. 翻译质量标准

### 5.1 术语一致性

同一英文术语在全平台内的中文翻译必须一致：

| 英文 | 统一译法 | 禁用译法 |
|------|---------|---------|
| margin of safety | 安全边际 | 安全裕度、安全空间 |
| moat | 护城河 | 壕沟、壁垒 |
| intrinsic value | 内在价值 | 固有价值、本质价值 |
| circle of competence | 能力圈 | 能力范围、知识圈 |
| Mr. Market | 市场先生 | 市场先生（可接受，但要一致） |
| cigar butt | 烟蒂股 | 烟屁股股票 |
| franchise | 特许经营权 | 专营权 |

### 5.2 人名翻译

使用中国大陆通用的标准译名：

| 英文 | 标准译名 |
|------|---------|
| Benjamin Graham | 本杰明·格雷厄姆 |
| Warren Buffett | 沃伦·巴菲特 |
| Charlie Munger | 查理·芒格 |
| Philip Fisher | 菲利普·费雪 |
| Peter Lynch | 彼得·林奇 |
| Howard Marks | 霍华德·马克斯 |
| John Bogle | 约翰·博格 |
| George Soros | 乔治·索罗斯 |
| Ray Dalio | 雷·达里奥 |
| Joel Greenblatt | 乔尔·格林布拉特 |
| Seth Klarman | 塞思·卡拉曼 |

### 5.3 公司名翻译

| 英文 | 标准译名 |
|------|---------|
| Berkshire Hathaway | 伯克希尔·哈撒韦 |
| Fidelity | 富达 |
| Vanguard | 先锋集团 |
| Goldman Sachs | 高盛 |
| Morgan Stanley | 摩根士丹利 |

---

## 6. 自动检查方法

### 6.1 检测英文残留

```bash
# 检测连续 4 个以上英文字母（排除已知保留项）
grep -oP '[A-Za-z]{4,}' books/new-book/index.html \
  | grep -v -E '^(ROE|EPS|DCF|ETF|IPO|CEO|CFO|GDP|PE|PB)$' \
  | sort | uniq -c | sort -rn
```

### 6.2 检测 HTML 属性中的英文

```bash
# 检查 meta 标签
grep -oP 'content="[^"]*[A-Za-z]{4,}[^"]*"' books/new-book/index.html

# 检查 title
grep -oP '<title>[^<]*[A-Za-z]{4,}[^<]*</title>' books/new-book/index.html
```

### 6.3 检测导航链接

```bash
# 导航栏中不应有英文
grep -oP 'class="nav-links"[^>]*>.*?</nav>' books/new-book/index.html \
  | grep -oP '[A-Za-z]{4,}'
```

---

## 7. 翻译检查清单

新书上线前逐项确认：

- [ ] `<title>` 全部中文
- [ ] `<meta name="description">` 全部中文
- [ ] 结构化数据（ld+json）全部中文
- [ ] 导航链接文字全部中文
- [ ] Hero 区域：书名、作者、简介全部中文
- [ ] 封面 CSS 渐变中的文字全部中文
- [ ] 所有 `.section-title` 全部中文
- [ ] 所有 `.chapter-card .ch-title` 全部中文
- [ ] 所有 `.block-label` 全部中文
- [ ] 所有 `.block-content` 全部中文（允许保留项）
- [ ] 所有 `.gold-quote .zh` 存在且中文
- [ ] 所有 `.gold-quote .why` 全部中文
- [ ] 所有 `.concept-box .concept-name` 全部中文
- [ ] 所有 `.concept-box .concept-body` 全部中文
- [ ] 所有 `.context-box` 内容全部中文
- [ ] 所有 `.counter-box` 内容全部中文
- [ ] 所有 `.china-box` 内容全部中文
- [ ] 所有 `.exercise-box` 内容全部中文
- [ ] 所有 `.term-table .zh` 存在
- [ ] 所有 `.takeaway-list li` 全部中文
- [ ] Footer 全部中文
- [ ] 按钮文字全部中文
- [ ] 书架首页卡片：书名、作者、简介全部中文

---

## 8. 特殊场景处理

### 8.1 公式和计算

保留数字和数学符号，描述文字翻译：

```
正确：ROE = 净利润 / 股东权益 × 100%
错误：ROE = Net Profit / Shareholder Equity × 100%
```

### 8.2 图表标签

如果页面包含 SVG/Canvas 图表，所有轴标签、图例、标题必须中文化。

### 8.3 代码/技术术语

平台不涉及代码展示。JS 变量名、CSS 类名使用英文属于技术惯例，不在中文化检查范围内。

---

## 9. V2 新增术语

V2 新增塔勒布三部曲相关术语：

| 英文 | 统一译法 |
|------|---------|
| Black Swan | 黑天鹅 |
| Antifragile | 反脆弱 |
| Fooled by Randomness | 随机漫步的傻瓜 |
| Lindy Effect | 林迪效应 |
| Barbell Strategy | 杠铃策略 |
| Via Negativa | 否定法 |
| Convexity | 凸性 |
| Optionality | 选择权 |
| Skin in the Game | 风险共担 |

V2 新增 UI 术语：

| 概念 | 统一用词 |
|------|---------|
| Streak | 连续学习 / 打卡 |
| Onboarding | 新用户引导 |
| Recap | 前情提要 |
| XP (Experience Points) | 经验值 |

### 8.3 代码/技术术语

平台不涉及代码展示。如果未来添加，代码注释可用英文，但面向用户的说明文字必须中文。

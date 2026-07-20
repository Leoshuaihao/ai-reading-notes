#!/usr/bin/env python3
"""按 ADD_BOOK_STANDARD.md V3 标准生成完整精读页面
V3 改进（2026-07-20 同步标准文档）：
1. chapter-preview 3→1项（仅关键概念）
2. 金句必须含 en-detail 英文原文折叠
3. CTA Banner 已移除
4. 页面引入 chat.js
5. author-bio 支持 Q版卡通头像 + bio-highlight 标签
6. 每章输入 ≥4000 字 / prompt 要求 quote_en 英文原句
7. 并行API调用（3并发）+ 增量保存进度
"""
import json, os, time, requests, re
from concurrent.futures import ThreadPoolExecutor, as_completed

DEEPSEEK_KEY = os.environ.get("DEEPSEEK_KEY", "")  # 从环境变量读取，禁止硬编码
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
if not DEEPSEEK_KEY:
    print("⚠️  请先设置环境变量: export DEEPSEEK_KEY=sk-xxxx")
    print("   或在运行前 source ~/.secrets/deepseek_key.sh")
    # 不直接退出，允许 --build-only 模式（不需要 API）
BOOKS_DIR = "/Users/lee/WorkSpace/WorkBuddy/ai-reading-notes/books"
CHAPTERS_DIR = "/tmp/book_chapters"
PROGRESS_DIR = "/tmp/book_progress"
os.makedirs(PROGRESS_DIR, exist_ok=True)

# 书籍配置（含书特定元数据）
BOOKS = {
    "principles": {
        "title": "原则", "author": "瑞·达利欧", "author_en": "Ray Dalio",
        "year": "2017", "domain_cn": "心性与哲学", "domain_key": "mind",
        "chapter_file": "principles.json",
        "cover_gradient": "linear-gradient(135deg, #2d1b4e 0%, #1a0a3a 50%, #0d0520 100%)",
        "cover_text": "Principles",
        "author_initials": "RD",
        "subtitle": "生活与工作",
        "desc": "瑞·达利欧将自己40年的投资与人生经验凝练为「原则」。这本书分为三部分：他的历程、生活原则、工作原则。核心思想是通过极度求真、极度透明和创意择优，建立系统化的决策框架。桥水基金40年实践验证的原则体系，适用于投资、管理和人生决策。",
        "why_items": [
            ("🏆", "全球顶级对冲基金创始人的智慧结晶", "瑞·达利欧创办的桥水基金是全球最大的对冲基金之一。他将40年投资与管理经验提炼为可复制的原则体系，被《时代》杂志评为全球最具影响力100人之一。"),
            ("🧠", "系统化决策框架而非碎片化建议", "本书不是鸡汤式励志书，而是提供一套完整的决策操作系统：从理解现实→制定原则→算法化决策。生活原则和工作原则相互呼应，形成闭环。"),
            ("🇨🇳", "作者与中国近30年深厚渊源", "达利欧1984年首次访华，与中国结下不解之缘。他帮助建立中国证券市场，中信公司是他的首批客户。书中专门有中文版序言，原则体系对中国投资者特别有启发。"),
            ("⚡", "创意择优：超越民主与独裁的第三条路", "达利欧提出「创意择优」=极度求真+极度透明+ believability-weighted decision making。这种决策机制既非民主投票也非独裁，而是让最可信的人拥有更大权重，是组织管理的创新。"),
        ],
        "author_bio": "瑞·达利欧（Ray Dalio），1949年生于纽约皇后区。1975年在自己两居室的公寓里创办了桥水基金（Bridgewater Associates）。经过40多年发展，桥水成为全球最大的对冲基金，管理资产超过1500亿美元。达利欧被誉为「对冲基金之王」，其全天候投资策略和风险平价理论深刻影响了现代投资组合管理。2017年出版《原则》，畅销全球。2022年出版《原则：应对变化中的世界秩序》。他长期致力于中美文化交流，是中国金融市场的早期参与者。",
        "author_tags": ["对冲基金之王", "桥水基金创始人", "原则体系开创者", "中美文化桥梁"],
        "roadmap_intro": "全书38个精读单元分为5个模块，对应达利欧构建的「我的历程—生活原则—工作原则」三层结构。建议按顺序阅读前13章建立对原则体系的整体认知，工作原则部分可按「文化—机器—决策」三条主线交叉精读。",
        "roadmap_modules": [
            {"num": "模块1", "title": "我的历程", "pages": "Ch1-9 · 达利欧的人生故事、桥水的诞生与原则体系的由来"},
            {"num": "模块2", "title": "生活原则 ⭐核心", "pages": "Ch10-13 · 五步循环、克服自我与盲点、拥抱现实——个人决策的方法论"},
            {"num": "模块3", "title": "工作原则·文化", "pages": "Ch14-19 · 创意择优、公开透明、求取共识、可信度加权——组织文化的基石"},
            {"num": "模块4", "title": "工作原则·机器", "pages": "Ch20-30 · 选对人、像机器一样管理、诊断问题、系统化设计——组织执行力"},
            {"num": "模块5", "title": "综合决策与治理", "pages": "Ch31-38 · 决策两步法、用人之道、治理结构、创意择优的总成"},
        ],
    },
    "richdad": {
        "title": "富爸爸穷爸爸", "author": "罗伯特·清崎", "author_en": "Robert T. Kiyosaki",
        "year": "1997", "domain_cn": "商业认知", "domain_key": "business",
        "chapter_file": "richdad.json",
        "cover_gradient": "linear-gradient(135deg, #4a2a1a 0%, #2a1a0a 50%, #1a0a00 100%)",
        "cover_text": "Rich Dad\nPoor Dad",
        "author_initials": "RK",
        "subtitle": "全球最佳财商教育系列",
        "desc": "罗伯特·清崎通过「富爸爸」和「穷爸爸」两个父亲的对比，揭示了富人和穷人思维方式的根本差异。核心思想是：富人让钱为自己工作，穷人为钱工作。这本书全球销量超过4000万册，是财商教育的入门经典，改变了无数人的金钱观念。",
        "why_items": [
            ("🌍", "全球销量4000万册的财商启蒙", "自1997年出版以来，《富爸爸穷爸爸》被翻译成51种语言，在109个国家发行。它不是教你选股的技术分析书，而是重塑你对「资产」「负债」「现金流」的根本认知。"),
            ("💡", "资产vs负债：一个改变终生的简单定义", "清崎最核心的贡献是用极简的方式重新定义了资产和负债：资产是把钱放进你口袋的东西，负债是把钱从你口袋拿走的东西。这个定义让普通人第一次看清为什么努力工作却依然月光。"),
            ("🏠", "颠覆「自住房产是资产」的传统认知", "书中最具争议也最发人深省的观点：你的自住房不是资产而是负债。这个观点挑战了中国读者「买房就是理财」的固有思维，促使读者重新审视自己的财务结构。"),
            ("🇨🇳", "对中国「房奴」现象的超前预言", "1997年写的书，却精准预言了中国2000年后的房地产狂热和「房奴」现象。清崎对中产阶级「高收入≠富有」的分析，对今天的中国读者尤其有警示意义。"),
        ],
        "author_bio": "罗伯特·清崎（Robert T. Kiyosaki），1947年生于夏威夷一个日裔美国人家庭。父亲是夏威夷教育部长（穷爸爸），好友迈克的父亲是企业家（富爸爸）。清崎越战期间在海军陆战队服役，后加入施乐公司学习销售。1977年创办尼龙钱包公司，开始商业生涯。1994年实现财务自由。1997年出版《富爸爸穷爸爸》，开创「富爸爸」系列，全球销量超过4000万册。他的财商教育理念影响深远，但也因观点激进（如鼓励使用杠杆、贬低正规教育）而饱受争议。",
        "author_tags": ["财商教育之父", "富爸爸系列作者", "畅销书作家", "财务自由倡导者"],
        "roadmap_intro": "全书13个精读单元分为4个模块，从财务启蒙到财富基石，再到投资与行动。建议按顺序阅读前7章建立完整的财务认知框架，第10-13章可作为行动指南反复回看。",
        "roadmap_modules": [
            {"num": "模块1", "title": "财务启蒙", "pages": "Ch1-4 · 两个父亲、老鼠赛跑、金钱观碰撞、富人不为钱工作"},
            {"num": "模块2", "title": "财富基石 ⭐核心", "pages": "Ch5-7 · 资产vs负债、职业vs事业、税收陷阱与公司护身符"},
            {"num": "模块3", "title": "投资与能力", "pages": "Ch8-9 · 富人的投资之道与超越专业化的能力组合"},
            {"num": "模块4", "title": "行动与心智", "pages": "Ch10-13 · 五大心理障碍、10步唤醒理财天赋、行动至上、财商实战"},
        ],
    },
    "random-walk": {
        "title": "漫步华尔街", "author": "伯顿·马尔基尔", "author_en": "Burton G. Malkiel",
        "year": "1973", "domain_cn": "不确定性与风险", "domain_key": "uncertainty",
        "chapter_file": "random_walk_v2.json",
        "cover_gradient": "linear-gradient(135deg, #0d2a3a 0%, #1a4a5a 50%, #0a2030 100%)",
        "cover_text": "A Random\nWalk Down\nWall Street",
        "author_initials": "BM",
        "subtitle": "原书第11版",
        "desc": "伯顿·马尔基尔的《漫步华尔街》是随机漫步理论和有效市场假说的经典通俗读物。第11版更新了行为金融学、聪明β、生命周期投资等最新内容。核心观点：短期股价不可预测，长期指数化投资是普通投资者的最佳策略。这本书影响了无数投资者放弃主动选股，转向被动指数投资。",
        "why_items": [
            ("📊", "50年长销不衰的投资经典", "自1973年首版以来，《漫步华尔街》已更新至第11版，畅销50年。马尔基尔是普林斯顿大学经济学教授，曾任美国总统经济顾问委员会委员。这本书是商学院投资课程的必读参考书。"),
            ("🎲", "随机漫步理论的最佳通俗解读", "马尔基尔用生动的语言解释了为什么短期股价走势不可预测——股价已经反映了所有已知信息，未来的变化是「随机」的。这个理论对执着于「预测走势」的投资者是当头棒喝。"),
            ("📈", "指数基金的理论奠基之作", "马尔基尔不仅理论上是有效市场假说的拥护者，实践上也是指数基金的坚定倡导者。本书直接推动了指数基金行业的发展。约翰·博格尔创立先锋500指数基金时，深受本书影响。"),
            ("🇨🇳", "对A股散户化市场的深刻启示", "中国A股市场散户占比高、情绪化交易明显、市场效率较低。马尔基尔的理论既揭示了为什么大多数主动基金跑不赢指数，也指出了市场非有效处可能存在的超额收益机会，对中国投资者特别有启发。"),
        ],
        "author_bio": "伯顿·马尔基尔（Burton G. Malkiel），1932年生于波士顿。普林斯顿大学经济学教授，曾任该校经济系主任。耶鲁大学管理学院院长。美国总统经济顾问委员会委员。美国金融学会前会长。马尔基尔是有效市场假说的坚定拥护者，1973年出版《漫步华尔街》，成为指数投资运动的奠基之作。他长期担任先锋集团（Vanguard）董事，推动指数基金发展。学术研究涵盖市场效率、行为金融、技术分析有效性等领域。第11版新增了聪明β、行为金融学等前沿内容。",
        "author_tags": ["普林斯顿经济学教授", "指数投资理论奠基人", "有效市场假说权威"],
        "roadmap_intro": "全书15个精读单元分为5个模块，从随机漫步的核心理论与投机史出发，逐步深入到分析方法、风险理论、行为金融，最后落到普通投资者的实战手册。建议按顺序阅读，第8-9章和第12-15章是普通投资者最实用的部分。",
        "roadmap_modules": [
            {"num": "模块1", "title": "随机漫步与投机史", "pages": "Ch1-4 · 核心理论、从郁金香到南海泡沫、机构投机、互联网与房地产泡沫"},
            {"num": "模块2", "title": "两种分析方法 ⭐核心", "pages": "Ch5-7 · 技术分析与基本面分析的本质、局限及市场有效性"},
            {"num": "模块3", "title": "风险与组合理论", "pages": "Ch8-9 · 现代投资组合理论、风险测量与资产定价模型"},
            {"num": "模块4", "title": "行为金融与β", "pages": "Ch10-11 · 非理性投资的心理学根源、聪明β策略的真相与陷阱"},
            {"num": "模块5", "title": "投资者实战手册", "pages": "Ch12-15 · 投资健身手册、收益预测、生命周期资产配置、指数基金"},
        ],
    },
}

SYSTEM_PROMPT = """你是专业投资书籍精读编辑，精通中英文投资理论。请基于提供的原文内容，生成标准的章节精读卡片。

严格要求：
1. 内容必须基于原文，引用原文中的具体案例、数据、人物——不得编造原文不存在的事实
2. 除专业术语缩写（如DCF、PE、ROE、EPS）外，全部使用中文输出
3. key_concept：覆盖本章所有核心要点，挑重点讲，不设字数限制
4. culture_context：涉及美国金融制度/历史背景/社会语境时填写，无则留空
5. counter_view：本章概念有争议时填写反对者观点，无争议则留空
6. china_link：用你自己的知识补充本章概念在中国A股市场的关联应用。如果该概念确有中国市场案例，写出具体案例；如果没有明显关联，留空即可，不要编造
7. exercises：本章是否值得出思考题？内容丰富的章节出 1-2 道，内容简单的章节可以不出（空数组）。每道题必须联系实际投资决策
8. ai_first_reply 是当用户第一次打开这道思考题时AI的初始引导语（20-40字），必须体现本章主题，每道题不同
9. quote 必须从原文中精确摘录一句最有洞察力的中文原文（50-150字），不得自己编造
10. 输出必须是严格的JSON格式，不要有任何额外文字"""


def smart_truncate(content, max_chars=10000):
    """按段落边界截断内容，避免在句子中间切断"""
    if len(content) <= max_chars:
        return content
    # 找到最后一个完整段落
    cutoff = content.rfind('\n\n', 0, max_chars)
    if cutoff < max_chars // 2:
        # 没有足够长的段落边界，退回到句号截断
        cutoff = content.rfind('。', 0, max_chars)
        if cutoff > max_chars // 2:
            return content[:cutoff + 1]
        return content[:max_chars]
    return content[:cutoff]

def gen_chapter(book_title, chapter_title, content, ch_num, prev_context=None):
    """生成单个章节的JSON数据"""
    # 段落边界截断，最多喂 12000 字
    content_snippet = smart_truncate(content, 12000)

    context_block = ""
    if prev_context:
        context_block = f"\n前一章要点（用于保持上下文连贯）：\n核心概念：{prev_context.get('concept','无')}\n一句话：{prev_context.get('oneline','无')}\n"

    prompt = f"""为《{book_title}》第{ch_num}章「{chapter_title}」生成精读卡片。
{context_block}
原文内容（{len(content_snippet)}字）：
{content_snippet}

请输出这个JSON（只输出JSON，不要任何其他文字，不要```标记）：
{{
  "subtitle": "副标题（8-15字，概括本章核心）",
  "positioning": "章节定位：本章在全书中的位置和核心回答的问题（40-80字）",
  "key_concept": "核心概念深度解读：覆盖本章所有重要概念和观点，要具体、有逻辑、引用原文案例，不设字数上限",
  "culture_context": "文化背景补充（涉及美国金融制度/历史背景/社会语境时填写，无则留空字符串）",
  "counter_view": "反方观点（本章概念有争议时填写反对者观点，无则留空字符串）",
  "china_link": "中国市场关联：用你的知识补充本章概念在A股的关联。有具体案例则写，没有明显关联则留空，不要编造",
  "preview_concept": "关键概念名（2-6字）",
  "preview_question": "核心问题（1句话，15-30字）",
  "preview_oneline": "一句话总结（20-40字）",
  "terms": [{{"en": "专业缩写如DCF/PE（非缩写留空）", "zh": "中文术语名", "note": "解读"}}],
  "takeaways": ["要点1", "要点2", "要点3"],
  "exercises": [
    {{"q": "思考题（联系实际投资决策，内容简单可留空数组）", "hint": "提示", "ai_first_reply": "AI初始回复"}}
  ],
  "quote": "从原文中精确摘录一句最有洞察力的中文原文（50-150字）",
  "quote_en": "英文原文（从epub原文中找到对应的英文原句，找不到则留空字符串）",
  "quote_why": "解读（20-40字，说明这句为什么重要）"
}}"""

    for attempt in range(2):
        try:
            resp = requests.post(DEEPSEEK_URL,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {DEEPSEEK_KEY}"},
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3, "max_tokens": 4000
                }, timeout=120)
            if resp.status_code == 200:
                text = resp.json()["choices"][0]["message"]["content"]
                text = text.strip()
                if text.startswith("```"):
                    text = re.sub(r'^```\w*\n?', '', text)
                    text = re.sub(r'\n?```$', '', text)
                result = json.loads(text)
                return result
            else:
                print(f"  API错误: {resp.status_code} - {resp.text[:100]}")
                return None
        except json.JSONDecodeError as e:
            print(f"  JSON解析失败(尝试{attempt+1}/2): {e}")
            if attempt == 0:
                continue
            return None
        except Exception as e:
            print(f"  生成失败: {e}")
            return None
    return None


def build_chapter_html(ch, num, book_title):
    """根据JSON数据构建标准章节HTML"""
    if ch is None:
        return ""

    # Preview（1项：仅关键概念，V3 决议）
    preview_concept = ch.get("preview_concept", "")
    preview = f'''    <div class="chapter-preview">
      <div class="preview-item"><span class="preview-label">🔑 关键概念：</span><span class="preview-text">{preview_concept}</span></div>
    </div>'''

    blocks = []

    # 章节定位
    blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:var(--gold)"></span> 章节定位</div>
      <div class="block-content"><p>{ch.get("positioning", "")}</p></div>
    </div>''')

    # 金句（V3 强制：必须有 en-detail 折叠原文）
    quote_text = ch.get("quote", "")
    quote_en = ch.get("quote_en", "")
    quote_why = ch.get("quote_why", "")
    if quote_text:
        en_detail = ""
        if quote_en:
            en_detail = f'\n      <details class="en-detail"><summary>📖 原文（点击展开）</summary><div class="en">{quote_en}</div></details>'
        blocks.append(f'''    <div class="gold-quote">{en_detail}
      <div class="zh">「{quote_text}」</div>
      <div class="why">💬 {quote_why}</div>
    </div>''')

    # 核心概念
    blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:var(--blue)"></span> 核心概念深度解读</div>
      <div class="concept-box">
        <h3 class="concept-name">{preview_concept}</h3>
        <div class="concept-body"><p>{ch.get("key_concept", "")}</p></div>
      </div>
    </div>''')

    # 文化背景
    culture = ch.get("culture_context", "")
    if culture:
        blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:var(--green)"></span> 🌍 文化背景补充</div>
      <div class="context-box"><p>{culture}</p></div>
    </div>''')

    # 反方观点
    counter = ch.get("counter_view", "")
    if counter:
        blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:#b33"></span> ⚔️ 反方观点</div>
      <div class="counter-box"><p>{counter}</p></div>
    </div>''')

    # 中国市场
    china = ch.get("china_link", "")
    if china:
        blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:#e0a030"></span> 🇨🇳 中国市场关联</div>
      <div class="china-box"><p>{china}</p></div>
    </div>''')

    # 术语表
    terms = ch.get("terms", [])
    if terms:
        terms_html = "".join(
            f'<tr><td><strong>{t["en"]}</strong></td><td class="zh">{t["zh"]}</td><td>{t.get("note", "")}</td></tr>'
            for t in terms
        )
        blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:var(--purple)"></span> 📊 关键术语词典</div>
      <table class="term-table">{terms_html}</table>
    </div>''')

    # 要点总结
    takeaways = ch.get("takeaways", [])
    if takeaways:
        items = "".join(f'<li>{t}</li>' for t in takeaways)
        blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:var(--accent)"></span> 💡 本章要点总结</div>
      <ul class="takeaway-list">{items}</ul>
    </div>''')

    # 思考题
    exercises = ch.get("exercises", [])
    if exercises:
        ex_html = ""
        for i, ex in enumerate(exercises):
            ai_reply = ex.get("ai_first_reply", ex.get("hint", "思考一下..."))
            ex_html += f'''    <div class="exercise-box">
        <p class="q">{ex["q"]}</p>
        <p class="hint">💡 提示：{ex.get("hint", "")}</p>
        <div class="chat-widget" id="chat-{book_title[:2]}-ch{num}-q{i+1}">
          <div class="chat-header" onclick="toggleChat(\'chat-{book_title[:2]}-ch{num}-q{i+1}\')" tabindex="0" role="button" aria-expanded="false">
            <span class="chat-icon">💬</span><span>跟AI讨论这道题</span><span class="chat-arrow">▾</span>
          </div>
          <div class="chat-body">
            <div class="chat-msg ai"><div class="avatar">🤖</div><div class="bubble">{ai_reply}</div></div>
          </div>
          <div class="typing-indicator">🤖 AI正在思考<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>
          <div class="chat-error"></div>
          <div class="chat-input-area">
            <input autocapitalize="off" enterkeyhint="send" placeholder="输入你的想法..." type="text" aria-label="输入消息"/>
            <button onclick="sendChat(\'chat-{book_title[:2]}-ch{num}-q{i+1}\', this.parentElement.querySelector(\'input\'))" aria-label="发送消息">发送</button>
          </div>
        </div>
      </div>
'''
        blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:var(--purple)"></span> 🤔 思考题</div>
{ex_html}    </div>''')

    subtitle = ch.get("subtitle", "")
    ch_title = f"第{num}章 · {subtitle}" if subtitle else f"第{num}章"

    return f'''  <article class="chapter-card" id="ch{num}" aria-labelledby="ch{num}-title">
    <div class="ch-header">
      <div class="ch-num">{num}</div>
      <div>
        <h2 class="ch-title" id="ch{num}-title">{ch_title}</h2>
      </div>
{preview}
    </div>
{chr(10).join(blocks)}
  </article>'''


def build_book_page(book_slug, config, chapters_data):
    """构建完整书籍页面（含所有标准模块）"""
    title = config["title"]
    author = config["author"]
    year = config["year"]
    domain_cn = config["domain_cn"]
    cover_gradient = config["cover_gradient"]
    cover_text = config["cover_text"]
    subtitle = config["subtitle"]
    desc = config["desc"]
    why_items = config["why_items"]
    author_bio = config["author_bio"]
    author_initials = config.get("author_initials", config["author"][:2])
    author_tags = config.get("author_tags", [])  # bio-highlight 标签
    author_avatar = config.get("author_avatar", "")  # Q版卡通头像路径（相对于books/slug/）

    # 作者头像：优先Q版卡通图，回落缩写+渐变
    if author_avatar:
        avatar_html = f'<div class="avatar" aria-hidden="true"><img src="{author_avatar}" alt="{author}卡通头像" onerror="this.style.display=\'none\';this.parentElement.style.background=\'{cover_gradient}\';this.parentElement.textContent=\'{author_initials}\';" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/></div>'
    else:
        avatar_html = f'<div class="avatar" aria-hidden="true" style="background: {cover_gradient};">{author_initials}</div>'

    # bio-highlight 标签
    tags_html = ""
    if author_tags:
        tags_html = "\n        " + "\n        ".join(f'<span class="bio-highlight">{t}</span>' for t in author_tags)

    # 过滤有效章节
    valid_chapters = [(i+1, ch) for i, ch in enumerate(chapters_data) if ch is not None]
    total = len(valid_chapters)

    # 导航链接
    nav_links = ""
    for num, ch in valid_chapters:
        subtitle_text = ch.get("subtitle", f"第{num}章")
        nav_links += f'<a href="#ch{num}">第{num}章 · {subtitle_text}</a>\n'

    # 章节HTML
    chapter_html = "\n".join(build_chapter_html(ch, num, title) for num, ch in valid_chapters)

    # why-section
    why_html = ""
    for icon, why_title, why_desc in why_items:
        why_html += f'''    <div class="why-item">
      <div class="why-icon">{icon}</div>
      <h3 class="why-title">{why_title}</h3>
      <div class="why-desc">{why_desc}</div>
    </div>
'''

    # roadmap（V3 强制：模块卡片，禁止 chapter-nav 链接列表）
    roadmap_intro = config.get("roadmap_intro", f"全书{total}章精读，建议按顺序阅读。")
    roadmap_modules = config.get("roadmap_modules", [])
    if not roadmap_modules:
        # 降级方案：如果没配置模块，生成单一模块
        roadmap_modules = [{"num": "模块1", "title": "全书精读", "pages": f"Ch1-{total} · 全部章节"}]
    roadmap_cards = "\n".join(
        f'    <div class="part-card current">\n'
        f'      <div class="part-num">📖 {m["num"]}</div>\n'
        f'      <h3 class="part-title">{m["title"]}</h3>\n'
        f'      <div class="part-pages">{m["pages"]}</div>\n'
        f'    </div>'
        for m in roadmap_modules
    )

    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>{title} — AI精读笔记</title>
<meta name="description" content="AI驱动的《{title}》深度精读笔记。{author}的经典著作，逐章解读投资智慧。"/>
<meta property="og:title" content="{title} — AI精读笔记"/>
<meta property="og:description" content="AI驱动的《{title}》深度精读笔记。{desc[:80]}"/>
<meta property="og:type" content="article"/>
<meta property="og:image" content="../../assets/img/og-image.png"/>
<link rel="stylesheet" href="../../assets/css/style.css"/>
<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"Book","name":"{title}","author":{{"@type":"Person","name":"{author}"}},"inLanguage":"zh","datePublished":"{year}","description":"{desc[:100]}"}}
</script>
</head>
<body>
<nav class="top-nav" role="navigation" aria-label="章节导航">
  <span class="logo"><a href="../../" style="color:var(--accent);text-decoration:none;">📚 AI精读</a></span>
  <div class="nav-links">
    <a href="../../index.html">🏠 修行</a>
    <a href="../../bookshelf.html">📚 书架</a>
    <a href="../../my.html">🧘 我的</a>
    <a class="active" href="#overview">概览</a>
    <a href="#roadmap">路线图</a>
    <a href="#intro">导言</a>
{nav_links}  </div>
  <button class="nav-toggle" onclick="this.classList.toggle('open');this.parentElement.querySelector('.nav-links').classList.toggle('open')" aria-label="菜单"><span></span><span></span><span></span></button>
</nav>

<div class="container wide">

<!-- BOOK HERO -->
<section class="book-hero" id="overview" aria-labelledby="hero-title">
  <div class="cover" aria-hidden="true" style="background: {cover_gradient};">{cover_text}</div>
  <div class="info">
    <h1 id="hero-title">《{title}》<span style="font-size:16px;font-weight:400;color:var(--text-secondary);display:block;margin-top:4px;">{subtitle}</span></h1>
    <div class="author">{author}</div>
    <div class="meta-row">
      <span class="tag primary">📖 {domain_cn}域</span>
      <span class="tag">⏱️ 精读约 8-10 小时</span>
      <span class="tag">📅 {year}</span>
      <span class="tag">📑 {total}章精读</span>
    </div>
    <p class="desc">{desc}</p>
    <a class="cta-btn" href="#intro" onclick="event.preventDefault();var t=document.querySelector('#intro');if(t){{var top=t.getBoundingClientRect().top+window.pageYOffset-60;window.scrollTo({{top:top,behavior:'smooth'}});}}" aria-label="开始精读">🚀 开始精读</a>
  </div>
</section>

<!-- WHY THIS BOOK -->
<section aria-labelledby="why-title">
  <h2 class="section-title" id="why-title"><span class="emoji">💡</span> 为什么这本书值得精读？</h2>
  <div class="why-section">
{why_html}  </div>
</section>

<!-- AUTHOR BIO -->
<section aria-labelledby="author-title">
  <h2 class="section-title" id="author-title"><span class="emoji">👤</span> 作者简介</h2>
  <div class="author-bio">
    {avatar_html}
    <div class="bio-content">
      <h3>{author}</h3>
      <p>{author_bio}</p>{tags_html}
    </div>
  </div>
</section>

<!-- ROADMAP -->
<section aria-labelledby="roadmap-title">
  <h2 class="section-title" id="roadmap"><span class="emoji">🗺️</span> 阅读路线图</h2>
  <p style="color:var(--text-secondary);margin-bottom:20px;font-size:14px;">{roadmap_intro}</p>
  <div class="roadmap" id="roadmap-modules">
{roadmap_cards}
  </div>
</section>

<!-- PROGRESS -->
<div class="progress-section" id="progress-section">
  <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
  <div class="progress-text">阅读进度：<span id="progress-percent">0%</span> · <span id="progress-chapters">0/{total}</span> 章</div>
</div>

<!-- CHAPTERS -->
<section id="intro">
{chapter_html}
</section>

<footer>
  <p>📚 AI精读笔记 · 《{title}》{total}章精读</p>
  <p><a href="../../bookshelf.html" style="color:var(--accent);">← 返回完整书架</a></p>
</footer>

</div>
<button class="back-to-top" onclick="window.scrollTo({{top:0,behavior:'smooth'}})">⬆</button>
<script src="../../assets/js/data.js"></script>
<script src="../../assets/js/app.js"></script>
<script src="../../assets/js/chat.js"></script>
</body>
</html>'''


def process_book(slug, config):
    """处理单本书：生成所有章节并构建HTML"""
    print(f"\n{'='*60}")
    print(f"📖 {config['title']} ({config['domain_cn']}域)")

    # 读取章节
    ch_file = os.path.join(CHAPTERS_DIR, config["chapter_file"])
    if not os.path.exists(ch_file):
        print(f"  章节文件不存在: {ch_file}")
        return

    with open(ch_file, 'r') as f:
        raw_chapters = json.load(f)

    total_chapters = len(raw_chapters)
    print(f"  共 {total_chapters} 章")

    # 检查已有进度
    progress_file = os.path.join(PROGRESS_DIR, f"{slug}_progress.json")
    chapters_data = [None] * total_chapters
    if os.path.exists(progress_file):
        with open(progress_file) as f:
            saved = json.load(f)
        for i, ch in enumerate(saved):
            if i < total_chapters:
                chapters_data[i] = ch
        done = sum(1 for c in chapters_data if c is not None)
        print(f"  已有进度: {done}/{total_chapters} 章")

    # 生成缺失的章节
    tasks = []
    prev_context = None  # 前一章的核心信息
    for i, ch in enumerate(raw_chapters):
        if chapters_data[i] is not None:
            # 已生成：更新上下文供下一章使用
            if chapters_data[i]:
                prev_context = {
                    "concept": chapters_data[i].get("preview_concept", ""),
                    "oneline": chapters_data[i].get("preview_oneline", "")
                }
            continue
        title = ch.get("title", f"第{i+1}章")
        content = ch.get("content", "")
        if len(content) < 50:
            print(f"  [{i+1}] 内容太短，跳过")
            continue
        tasks.append((i, title, content, i+1, prev_context))
        prev_context = None  # 重置（只用前一章有数据的上下文）

    print(f"  需生成: {len(tasks)} 章")

    # 并行生成（3并发）
    def gen_task(args):
        idx, title, content, num, ctx = args
        data = gen_chapter(config["title"], title, content, num, ctx)
        return idx, data

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(gen_task, t): t for t in tasks}
        completed = 0
        for future in as_completed(futures):
            idx, data = future.result()
            chapters_data[idx] = data
            completed += 1
            task_info = futures[future]
            title = task_info[1][:25]
            status = "✅" if data else "❌"
            print(f"  [{completed}/{len(tasks)}] 第{idx+1}章 {title}... {status}")

            # 每5章保存一次进度
            if completed % 5 == 0:
                with open(progress_file, 'w') as f:
                    json.dump(chapters_data, f, ensure_ascii=False)
                print(f"  💾 进度已保存 ({completed}/{len(tasks)})")

    # 最终保存进度
    with open(progress_file, 'w') as f:
        json.dump(chapters_data, f, ensure_ascii=False)

    valid = sum(1 for c in chapters_data if c is not None)
    print(f"  有效章节: {valid}/{total_chapters}")

    # 构建HTML
    html = build_book_page(slug, config, chapters_data)
    book_dir = os.path.join(BOOKS_DIR, slug)
    os.makedirs(book_dir, exist_ok=True)
    out_file = os.path.join(book_dir, "index.html")
    with open(out_file, 'w') as f:
        f.write(html)
    print(f"  ✅ 已保存: {out_file} ({len(html)} 字符)")


# ========== 主流程 ==========
if __name__ == "__main__":
    import sys
    build_only = "--build-only" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--build-only"]
    # 支持指定单本书
    if args:
        targets = {k: BOOKS[k] for k in args if k in BOOKS}
    else:
        targets = BOOKS

    for slug, config in targets.items():
        try:
            if build_only:
                # 只从已保存的进度构建HTML
                progress_file = os.path.join(PROGRESS_DIR, f"{slug}_progress.json")
                if not os.path.exists(progress_file):
                    print(f"  ❌ 无进度文件: {progress_file}")
                    continue
                with open(progress_file) as f:
                    chapters_data = json.load(f)
                valid = sum(1 for c in chapters_data if c is not None)
                print(f"📖 {config['title']}: 从进度文件构建 ({valid}章)")
                html = build_book_page(slug, config, chapters_data)
                book_dir = os.path.join(BOOKS_DIR, slug)
                os.makedirs(book_dir, exist_ok=True)
                with open(os.path.join(book_dir, "index.html"), 'w') as f:
                    f.write(html)
                print(f"  ✅ 已保存 ({len(html)} 字符)")
            else:
                process_book(slug, config)
        except Exception as e:
            print(f"  ❌ 处理失败: {e}")
            import traceback
            traceback.print_exc()

    print("\n🎉 全部完成！")

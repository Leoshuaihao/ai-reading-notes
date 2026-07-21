#!/usr/bin/env python3
"""按 ADD_BOOK_STANDARD.md V4 标准生成完整精读页面

核心行为：
- 从 /tmp/book_chapters/ 读取 epub 提取的章节 JSON
- 通过 DeepSeek API 将每章原文转化为中文精读卡片（temperature=0.3，3并发，增量保存）
- 按标准构建 HTML：13 项页面结构 + 每章 9 block（P0/P1/P2 优先级体系）
- 自动处理：🗺️ 阅读路线图、chapter-preview、金句 en-detail 折叠、chat-widget 嵌入、术语表过滤空 en、中文化
- 输出到 books/{slug}/index.html
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
    "most-important-thing": {
        "title": "投资最重要的事", "author": "霍华德·马克斯", "author_en": "Howard Marks",
        "year": "2011", "domain_cn": "周期与市场", "domain_key": "cycle",
        "chapter_file": "most-important-thing-v2.json",
        "cover_gradient": "linear-gradient(135deg, #1a3a5c 0%, #0d1f33 50%, #050f1a 100%)",
        "cover_text": "The Most\nImportant Thing\nIlluminated",
        "author_initials": "HM",
        "subtitle": "不寻常的智慧，不寻常的利润",
        "desc": "橡树资本联合创始人霍华德·马克斯将二十年投资备忘录浓缩为21条「最重要的事」。每一章解释一个核心投资原则——第二层次思维、风险重新定义、钟摆理论、逆向投资——并配以橡树资本的真实投资案例。注解版增加了四位顶级投资人的逐章评注和马克斯自己的回顾性自注，相当于一场横跨三代投资人的大师对话。",
        "why_items": [
            ("🧠", "21条核心原则 ≠ 心灵鸡汤", "马克斯写的不是「你要乐观」「你要坚持」这种废话。每一条原则都有具体定义、反面案例和可操作的检查清单。比如「第二层次思维」——不是比大众多想一层，而是想大众想不到的那件事。"),
            ("⚠️", "对「风险」的彻底重新定义", "全书最核心的贡献：风险不是波动性，而是永久性损失的概率。马克斯花了四章（理解风险、识别风险、控制风险、关注周期）系统地拆解风险的来源、表现和应对。这在中文投资书里几乎找不到同等级别的深度讨论。"),
            ("🇨🇳", "中国投资者的「周期教科书」", "马克斯的周期理论和钟摆理论完美适配A股的极端波动特征。他教你观察的不是K线，而是信贷周期、投资者心理、估值水平的同向共振——三个维度同向极端时，往往是最佳买卖时机。"),
            ("🗣️", "四位顶级投资人的逐章注解", "格雷厄姆和多德价值投资中心掌门人布鲁斯·格林沃尔德作序。塞思·卡拉曼（《安全边际》作者）、乔尔·格林布拉特（《股市稳赚》作者）等四位顶级投资人对每一章做了注解。再加上马克斯自己的回顾性自注——相当于一场六人的投资研讨会。"),
        ],
        "author_bio": "霍华德·马克斯（Howard Marks），1946年生于纽约，沃顿商学院和芝加哥大学商学院毕业。1985年加入TCW集团管理高收益债券和可转换证券，1995年与合伙人共同创立橡树资本（Oaktree Capital Management）。截至2023年，橡树资本管理资产超过1800亿美元，专注于另类投资（不良债务、高收益债券、私募股权）。马克斯自1990年起撰写投资备忘录，被巴菲特称为「我第一时间打开并阅读的邮件」。他的备忘录以深刻、清晰、反直觉著称，在2000年互联网泡沫和2008年金融危机前夕均准确预警了市场风险。2011年将备忘录精华整理为《投资最重要的事》出版。",
        "author_tags": ["橡树资本联合创始人", "不良债务投资大师", "周期与风险哲学家", "巴菲特最推崇的备忘录作者"],
        "roadmap_intro": "全书22个精读单元分为4个模块，从思维框架到风险体系再到实战策略。建议先通读前3章建立「第二层次思维+价值判断」的认知框架，第5-9章的风险与周期体系是全书精华——理解了这部分，你就理解了马克斯为什么能在2008年危机中大举买入。",
        "roadmap_modules": [
            {"num": "模块1", "title": "思维框架 ⭐基础", "pages": "导言-Ch3 · 第二层次思维、市场有效性、准确估计价值——建立不同于大众的认知框架"},
            {"num": "模块2", "title": "风险与周期 ⭐核心", "pages": "Ch4-9 · 价格与价值、理解/识别/控制风险、关注周期、钟摆意识——全书最精华的部分"},
            {"num": "模块3", "title": "心理与行为 ⭐核心", "pages": "Ch10-12 · 抵御消极影响、逆向投资、寻找便宜货——在别人恐惧时保持理性"},
            {"num": "模块4", "title": "实战与防御", "pages": "Ch13-21 · 耐心等待、认识预测局限、多元化、避免错误、增值、合理预期——把原则变成组合"},
        ],
    },
    "buffett-way": {
        "title": "巴菲特之道", "author": "罗伯特·哈格斯特朗", "author_en": "Robert G. Hagstrom",
        "year": "1994", "domain_cn": "资产估值", "domain_key": "valuation",
        "chapter_file": "buffett-way-v2.json",
        "cover_gradient": "linear-gradient(135deg, #1a3a5c 0%, #0d2240 50%, #051020 100%)",
        "cover_text": "The Warren\nBuffett Way",
        "author_initials": "RH",
        "subtitle": "沃伦·巴菲特的投资方法论",
        "desc": "罗伯特·哈格斯特朗系统梳理了巴菲特的投资哲学：12条永恒原则（企业、管理、财务、市场）、9个经典案例研究、集中投资组合管理。这本书是理解巴菲特从「捡烟蒂」到「以合理价格买伟大企业」进化之路的最佳读物，30周年纪念版加入了最新的投资案例分析。",
        "why_items": [
            ("🏆", "系统化解读巴菲特投资体系的最佳入门", "哈格斯特朗不是巴菲特的传记作者，而是第一个系统拆解巴菲特方法论的基金经理。他把巴菲特的选股逻辑提炼为12条可操作的原则，把「股神」的直觉变成了可学习的框架。"),
            ("📊", "12条永恒原则 + 9个经典案例", "企业三原则（简单易懂、持续经营历史、良好前景）、管理三原则（理性、坦诚、抗拒惯性）、财务四原则（ROE、所有者收益、利润率、一美元前提）、市场二原则（内在价值、安全边际）。每条原则都配有巴菲特的真实投资案例。"),
            ("🇨🇳", "A股投资者最该补的「巴菲特实操课」", "国内讲巴菲特的书很多，但大多停留在「别人恐惧我贪婪」的鸡汤层面。这本书告诉你：巴菲特怎么算内在价值？怎么判断护城河？为什么卖出几乎从不在他的字典里？这些都是A股投资者最缺的实操框架。"),
            ("🔄", "集中投资 vs 分散投资的理论依据", "哈格斯特朗用凯利公式和概率论论证了巴菲特的集中投资策略。不是品味偏好，而是数学最优解。这对习惯分散化投资的中国投资者是一次深度思维冲击。"),
        ],
        "author_bio": "罗伯特·哈格斯特朗（Robert G. Hagstrom），美盛基金（Legg Mason）高级基金经理，管理增长型基金超过20年。他是巴菲特的长期研究者和信徒，1994年首次出版《巴菲特之道》即成为全球畅销书，被翻译成18种语言。哈格斯特朗不是简单地转述巴菲特的投资语录，而是从基金经理的实操视角拆解了巴菲特决策背后的逻辑——公式怎么算、数字怎么读、什么条件下该买、什么条件下该等。30周年纪念版新增了对伯克希尔最新投资组合的分析。",
        "author_tags": ["美盛基金经理", "巴菲特方法论首席拆解者", "集中投资理论家", "纽约时报畅销作家"],
        "roadmap_intro": "全书8个精读单元分为3个模块，从「巴菲特是谁」到「巴菲特怎么想」再到「巴菲特做了什么」。建议先通读前3章建立对巴菲特投资哲学的完整认知，第4章的9个案例研究是全书精华——把前面的原则一一落实到真实的投资决策中。",
        "roadmap_modules": [
            {"num": "模块1", "title": "巴菲特是谁 ⭐基础", "pages": "Ch1-2 · 巴菲特的统计学奇迹、格雷厄姆/费雪/芒格三重思想传承"},
            {"num": "模块2", "title": "巴菲特怎么选股 ⭐核心", "pages": "Ch3-4 · 12条永恒原则（企业/管理/财务/市场）、9个经典案例研究"},
            {"num": "模块3", "title": "巴菲特的投资哲学", "pages": "Ch5-8 · 集中投资组合管理、投资心理学、耐心的价值、巴菲特综合评估"},
        ],
    },
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
    "fisher": {
        "title": "怎样选择成长股", "author": "菲利普·A·费雪", "author_en": "Philip A. Fisher",
        "year": "1958", "domain_cn": "商业认知", "domain_key": "business",
        "chapter_file": "fisher.json",
        "cover_gradient": "linear-gradient(135deg, #1a3a4a 0%, #0d2535 50%, #051020 100%)",
        "cover_text": "Common Stocks\nand Uncommon\nProfits",
        "author_initials": "PF",
        "subtitle": "普通股和不普通的利润",
        "desc": "巴菲特说自己是\u201c85%的格雷厄姆 + 15%的费雪\u201d。这本1958年出版的成长股投资奠基之作，首次提出以\u201c闲聊调研法\u201d调研企业，用15条原则筛选成长股。费雪教你：买对成长股，然后什么也不做\u2014\u2014这才是最赚钱的策略。",
        "why_items": [
            ("\U0001f3db\ufe0f", "巴菲特的\u201c另一半\u201d导师", "巴菲特公开表示他融合了格雷厄姆的价值投资与费雪的成长股哲学。理解费雪才能真正理解巴菲特的投资进化\u2014\u2014从\u201c捡烟蒂\u201d到\u201c以合理价格买入伟大企业\u201d。"),
            ("\U0001f50d", "\u201c闲聊法\u201d\u2014\u2014被严重低估的投资利器", "中文译本将Scuttlebutt Method简单译为\u201c闲聊法\u201d，完全无法传达这套系统性企业调研方法论的精髓。费雪教你如何通过竞争对手、供应商、客户、前雇员等多维度信息源拼凑出企业全貌。"),
            ("\U0001f4cb", "15条选股原则\u2014\u2014穿越60年仍然有效", "费雪的15条原则涵盖市场潜力、研发能力、利润率、劳资关系、管理层诚信等多个维度，至今被华尔街基金经理奉为圭臬。这是第一套系统化的成长股筛选框架。"),
            ("\U0001f9e9", "填补价值投资之外的空白", "大多数中文投资书籍只讲格雷厄姆的安全边际。费雪告诉你：找到真正伟大的成长型公司，然后一直持有\u2014\u2014就像他在1950年代买入摩托罗拉并持有数十年那样。"),
        ],
        "author_bio": "菲利普·费雪（Philip A. Fisher，1907-2004），被誉为\u201c成长股投资之父\u201d。1928年从斯坦福商学院辍学进入投资行业，1931年创立费雪公司。他以极度集中的投资策略著称\u2014\u2014同时服务的客户不超过12位。费雪的核心洞察：找出极少数能在多年内实现每股收益爆发式增长的卓越公司，然后一直持有。他早在1950年代就投资了摩托罗拉、德州仪器等公司，并持有了数十年。巴菲特称自己是\u201c85%格雷厄姆+15%费雪\u201d，费雪的思想深刻影响了巴菲特从\u201c捡烟蒂\u201d到\u201c以合理价格买入伟大企业\u201d的进化。",
        "author_tags": ["成长股投资之父", "巴菲特精神导师之一", "闲聊调研法发明者", "斯坦福商学院"],
        "author_avatar": "../../assets/images/authors/philip-fisher.png",
        "roadmap_intro": "全书10个精读单元分为3个模块，从投资哲学与调研方法论出发，逐步深入到选股、交易、风险管理，最后落地到实战技巧。建议先通读第3章（15条原则）建立框架，再逐章精读。",
        "roadmap_modules": [
            {"num": "模块1", "title": "投资哲学与调研方法 \u2b50核心", "pages": "Ch1-2 · 投资哲学的演变、闲聊调研法的理论与实践"},
            {"num": "模块2", "title": "选股与交易", "pages": "Ch3-7 · 15条选股原则、应用指南、买卖时机、股利谬误"},
            {"num": "模块3", "title": "风险控制与实战", "pages": "Ch8-10 · 十大禁忌、保守型投资框架、寻找成长股的实战方法"},
        ],
    },
    "fisher_test": {
        "title": "怎样选择成长股", "author": "菲利普·A·费雪", "author_en": "Philip A. Fisher",
        "year": "1958", "domain_cn": "商业认知", "domain_key": "business",
        "chapter_file": "fisher.json",
        "cover_gradient": "linear-gradient(135deg, #1a3a4a 0%, #0d2535 50%, #051020 100%)",
        "cover_text": "Common Stocks\nand Uncommon\nProfits",
        "author_initials": "PF",
        "subtitle": "普通股和不普通的利润",
        "desc": "巴菲特说自己是\u201c85%的格雷厄姆 + 15%的费雪\u201d。这本1958年出版的成长股投资奠基之作，首次提出以\u201c闲聊调研法\u201d调研企业，用15条原则筛选成长股。费雪教你：买对成长股，然后什么也不做\u2014\u2014这才是最赚钱的策略。",
        "why_items": [
            ("\U0001f3db\ufe0f", "巴菲特的\u201c另一半\u201d导师", "巴菲特公开表示他融合了格雷厄姆的价值投资与费雪的成长股哲学。理解费雪才能真正理解巴菲特的投资进化\u2014\u2014从\u201c捡烟蒂\u201d到\u201c以合理价格买入伟大企业\u201d。"),
            ("\U0001f50d", "\u201c闲聊法\u201d\u2014\u2014被严重低估的投资利器", "中文译本将Scuttlebutt Method简单译为\u201c闲聊法\u201d，完全无法传达这套系统性企业调研方法论的精髓。费雪教你如何通过竞争对手、供应商、客户、前雇员等多维度信息源拼凑出企业全貌。"),
            ("\U0001f4cb", "15条选股原则\u2014\u2014穿越60年仍然有效", "费雪的15条原则涵盖市场潜力、研发能力、利润率、劳资关系、管理层诚信等多个维度，至今被华尔街基金经理奉为圭臬。这是第一套系统化的成长股筛选框架。"),
            ("\U0001f9e9", "填补价值投资之外的空白", "大多数中文投资书籍只讲格雷厄姆的安全边际。费雪告诉你：找到真正伟大的成长型公司，然后一直持有\u2014\u2014就像他在1950年代买入摩托罗拉并持有数十年那样。"),
        ],
        "author_bio": "菲利普·费雪（Philip A. Fisher，1907-2004），被誉为\u201c成长股投资之父\u201d。1928年从斯坦福商学院辍学进入投资行业，1931年创立费雪公司。他以极度集中的投资策略著称\u2014\u2014同时服务的客户不超过12位。费雪的核心洞察：找出极少数能在多年内实现每股收益爆发式增长的卓越公司，然后一直持有。他早在1950年代就投资了摩托罗拉、德州仪器等公司，并持有了数十年。巴菲特称自己是\u201c85%格雷厄姆+15%费雪\u201d，费雪的思想深刻影响了巴菲特从\u201c捡烟蒂\u201d到\u201c以合理价格买入伟大企业\u201d的进化。",
        "author_tags": ["成长股投资之父", "巴菲特精神导师之一", "闲聊调研法发明者", "斯坦福商学院"],
        "author_avatar": "../../assets/images/authors/philip-fisher.png",
        "roadmap_intro": "全书10个精读单元分为3个模块，从投资哲学与调研方法论出发，逐步深入到选股、交易、风险管理，最后落地到实战技巧。建议先通读第3章（15条原则）建立框架，再逐章精读。",
        "roadmap_modules": [
            {"num": "模块1", "title": "投资哲学与调研方法 \u2b50核心", "pages": "Ch1-2 · 投资哲学的演变、闲聊调研法的理论与实践"},
            {"num": "模块2", "title": "选股与交易", "pages": "Ch3-7 · 15条选股原则、应用指南、买卖时机、股利谬误"},
            {"num": "模块3", "title": "风险控制与实战", "pages": "Ch8-10 · 十大禁忌、保守型投资框架、寻找成长股的实战方法"},
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
    "alchemy-finance": {
        "title": "金融炼金术", "author": "乔治·索罗斯", "author_en": "George Soros",
        "year": "1987", "domain_cn": "周期与市场", "domain_key": "cycle",
        "chapter_file": "alchemy-finance.json",
        "cover_gradient": "linear-gradient(135deg, #2d1b2e 0%, #1a0d1a 50%, #0d0510 100%)",
        "cover_text": "The Alchemy\nof Finance",
        "author_initials": "GS",
        "subtitle": "反身性理论的实践",
        "desc": "索罗斯用反身性理论解释了金融市场如何通过认知与现实的正反馈循环制造泡沫和崩溃。这不是一本投资策略书，而是一本关于市场本质的哲学著作。理解反身性，才能真正理解为什么市场永远在走向极端。",
        "why_items": [
            ("📖", "经典中的经典", "索罗斯用反身性理论解释了金融市场如何通过认知与现实的正反馈循环制造泡沫和崩溃。这……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "George Soros，著名投资人和思想家，其著作深刻影响了全球投资界。本书是alchemy-finance的核心著作。",
        "roadmap_intro": "全书26章分为4个模块，建议按顺序精读：先理解反射性理论框架，再分析金融市场的反射循环，接着审视历史实验与政策博弈，最后反思方法论与制度改革。",
        "roadmap_modules": [
            {"num": "模块1", "title": "理论基石与范式批判 ⭐基础", "pages": "Ch1-3 · 批判主流均衡范式，建立反射性概念，并应用于股票市场与浮动汇率的不稳定分析。"},
            {"num": "模块2", "title": "信用、监管与银行体系的反射循环 ⭐核心", "pages": "Ch4-8 · 探讨信用与监管的反射循环、国际放款盛衰、联合放款系统、银行体系演进及购并寡头化。"},
            {"num": "模块3", "title": "历史实验：雷根大循环与市场博弈", "pages": "Ch9-18 · 从雷根大循环的转折、美元贬值实验、黄金时代到日本股市崩盘，分析政策与市场的反射互动。"},
            {"num": "模块4", "title": "反思与改革：方法论、危机与制度重构", "pages": "Ch19-26 · 反思即时实验困境、金融体系风险、社会科学方法论、市场均衡幻象，提出国际央行与制度改革建议。"}
        ],
    },

    "antifragile": {
        "title": "反脆弱", "author": "纳西姆·塔勒布", "author_en": "Nassim Nicholas Taleb",
        "year": "2012", "domain_cn": "不确定性与风险", "domain_key": "uncertainty",
        "chapter_file": "antifragile.json",
        "cover_gradient": "linear-gradient(135deg, #1a3020 0%, #0d1a10 50%, #050a05 100%)",
        "cover_text": "Antifragile",
        "author_initials": "NT",
        "subtitle": "从不确定性中获益",
        "desc": "塔勒布「不确定性」三部曲的巅峰之作。反脆弱不是坚强，也不是韧性——而是在冲击和波动中变得更强。这本书告诉你：为什么压力就是信息、为什么波动就是机会、为什么试图消除波动的系统最终会崩溃。",
        "why_items": [
            ("📖", "经典中的经典", "塔勒布「不确定性」三部曲的巅峰之作。反脆弱不是坚强，也不是韧性——而是在冲击和波……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Nassim Nicholas Taleb，著名投资人和思想家，其著作深刻影响了全球投资界。本书是antifragile的核心著作。",
        "roadmap_intro": "全书35个精读单元分为4个模块。建议从基础概念入手，逐步深入策略应用与批判反思，最后回归体系整合。",
        "roadmap_modules": [
            {"num": "模块1", "title": "思维框架 ⭐基础", "pages": "Ch1-8 · 建立反脆弱性的核心概念、三元结构、过度补偿与有机体/机械体区别"},
            {"num": "模块2", "title": "策略与工具 ⭐核心", "pages": "Ch9-16 · 拥抱随机性、杠铃策略、选择权与不对称性等实战方法"},
            {"num": "模块3", "title": "批判与反思", "pages": "Ch17-28 · 挑战预测、知识陷阱、非线性脆弱性及减法策略"},
            {"num": "模块4", "title": "体系与整合", "pages": "Ch29-35 · 利益攸关、职业伦理、术语体系与模型批判"}
        ],
    },

    "beating-street": {
        "title": "战胜华尔街", "author": "彼得·林奇", "author_en": "Peter Lynch",
        "year": "1993", "domain_cn": "商业认知", "domain_key": "business",
        "chapter_file": "beating-street.json",
        "cover_gradient": "linear-gradient(135deg, #3a2a1a 0%, #2a1a0a 50%, #150d05 100%)",
        "cover_text": "Beating\nthe Street",
        "author_initials": "PL",
        "subtitle": "业余投资者的选股实战",
        "desc": "继《彼得·林奇的成功投资》后，林奇在这本书中手把手展示了他是如何通过「逛街选股法」在26个行业中挑选股票。每一章都是一个行业实战案例——从零售到房地产，从储蓄银行到餐饮连锁。",
        "why_items": [
            ("📖", "经典中的经典", "继《彼得·林奇的成功投资》后，林奇在这本书中手把手展示了他是如何通过「逛街选股法……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Peter Lynch，著名投资人和思想家，其著作深刻影响了全球投资界。本书是beating-street的核心著作。",
        "roadmap_intro": "全书24章分为4个模块，建议先建立投资思维框架，再学习选股与调研实战，最后掌握组合管理与心理修炼。",
        "roadmap_modules": [
            {"num": "模块1", "title": "投资思维与理念 ⭐基础", "pages": "Ch1-5 · 建立逆向投资、长期持股、业余优势等核心理念，并学习如何克服焦虑坚定信心"},
            {"num": "模块2", "title": "基金运作与选股策略 ⭐核心", "pages": "Ch6-10 · 涵盖基金选择、资产配置，以及麦哲伦基金从初期到大型基金的选股艺术与调研方法"},
            {"num": "模块3", "title": "行业调研与逆向实战", "pages": "Ch11-20 · 通过零售、房地产、周期股、困境公用事业等案例，学习逛街调研与利空挖掘的具体技巧"},
            {"num": "模块4", "title": "组合管理与长期修炼", "pages": "Ch21-24 · 聚焦投资基金公司、餐饮股长线逻辑、定期检查组合及动态调仓的艺术"}
        ],
    },

    "black-swan": {
        "title": "黑天鹅", "author": "纳西姆·塔勒布", "author_en": "Nassim Nicholas Taleb",
        "year": "2007", "domain_cn": "不确定性与风险", "domain_key": "uncertainty",
        "chapter_file": "black-swan.json",
        "cover_gradient": "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #000000 100%)",
        "cover_text": "The Black\nSwan",
        "author_initials": "NT",
        "subtitle": "如何应对不可预知的未来",
        "desc": "在一个由极端事件驱动的世界里，我们却用钟形曲线来理解它——这就是问题所在。塔勒布深入分析了为什么预测总是失败、为什么历史由极少数极端事件塑造、以及如何在黑天鹅频出的世界里建立反脆弱的投资组合。",
        "why_items": [
            ("📖", "经典中的经典", "在一个由极端事件驱动的世界里，我们却用钟形曲线来理解它——这就是问题所在。塔勒布……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Nassim Nicholas Taleb，著名投资人和思想家，其著作深刻影响了全球投资界。本书是black-swan的核心著作。",
        "roadmap_intro": "全书32章分为4个模块，建议按认知觉醒→模型批判→生存法则→高阶应用的顺序精读，逐步构建黑天鹅思维体系。",
        "roadmap_modules": [
            {"num": "模块1", "title": "认知觉醒与黑天鹅本质 ⭐基础", "pages": "Ch1-10 · 从黑天鹅定义、反图书馆价值到证实谬误、叙事谬误，揭示人类认知盲区与历史隐藏的沉默证据。"},
            {"num": "模块2", "title": "预测批判与模型陷阱 ⭐核心", "pages": "Ch11-16 · 剖析游戏谬误、预测的局限与傲慢，强调认知谦逊，探讨如何在不可预测中生存并获益。"},
            {"num": "模块3", "title": "极端斯坦与统计骗局", "pages": "Ch17-22 · 从平均斯坦到极端斯坦的演化，揭露高斯钟形曲线的智力骗局，引入分形几何与伪风险概念，给出拥抱黑天鹅的生存法则。"},
            {"num": "模块4", "title": "高阶决策与稳健社会", "pages": "Ch23-32 · 向大自然学习波动智慧，澄清误解，引入第四象限决策框架，提出黑天鹅稳健社会的十条原则与爱命运哲学。"}
        ],
    },

    "buffett-letters": {
        "title": "巴菲特致股东的信", "author": "沃伦·巴菲特", "author_en": "Warren Buffett",
        "year": "1970-2017", "domain_cn": "资产估值", "domain_key": "valuation",
        "chapter_file": "buffett-letters.json",
        "cover_gradient": "linear-gradient(135deg, #1a3a5c 0%, #0d2240 50%, #051020 100%)",
        "cover_text": "Berkshire\nLetters",
        "author_initials": "WB",
        "subtitle": "近50年股东信精华",
        "desc": "巴菲特近50年的致股东信精华汇编。这些信件不仅是伯克希尔·哈撒韦的经营史，更是一部关于资本配置、估值、管理层评估和企业文化的实战教科书。每个投资者都该至少读一遍巴菲特股东信。",
        "why_items": [
            ("📖", "经典中的经典", "巴菲特近50年的致股东信精华汇编。这些信件不仅是伯克希尔·哈撒韦的经营史，更是一……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Warren Buffett，著名投资人和思想家，其著作深刻影响了全球投资界。本书是buffett-letters的核心著作。",
        "roadmap_intro": "全书45个精读单元分为4个模块。建议从保险与投资基础入门，逐步深入价值投资哲学与实战策略，最后以长期主义与资本配置收尾。",
        "roadmap_modules": [
            {"num": "模块1", "title": "保险与投资基础 ⭐基础", "pages": "Ch1-10 · 从免税债券、保险承保周期到通胀与会计迷雾，建立保险业与价值投资的核心认知。"},
            {"num": "模块2", "title": "价值投资哲学与实战策略 ⭐核心", "pages": "Ch11-22 · 涵盖所有者导向、回购、内在价值、市场先生、能力圈与集中投资，深入巴菲特投资思想。"},
            {"num": "模块3", "title": "并购、浮存金与保险帝国", "pages": "Ch23-35 · 聚焦保险浮存金、并购逻辑、护城河与风险控制，揭示伯克希尔扩张的核心引擎。"},
            {"num": "模块4", "title": "长期主义与资本配置智慧", "pages": "Ch36-45 · 危机坚守、回购艺术、账面价值与内在价值鸿沟，总结50年长期主义与未来展望。"}
        ],
    },

    "economic-moat": {
        "title": "巴菲特的护城河", "author": "帕特·多尔西", "author_en": "Pat Dorsey",
        "year": "2008", "domain_cn": "商业认知", "domain_key": "business",
        "chapter_file": "economic-moat.json",
        "cover_gradient": "linear-gradient(135deg, #1a3a4a 0%, #0d2530 50%, #051015 100%)",
        "cover_text": "The Little Book\nThat Builds\nWealth",
        "author_initials": "PD",
        "subtitle": "寻找真正的竞争优势",
        "desc": "晨星公司前股票研究主管多尔西系统拆解了「护城河」——什么是真正的竞争优势，什么只是暂时的领先。四种护城河（无形资产、转换成本、网络效应、成本优势）的判定框架，是选股者不可或缺的分析工具。",
        "why_items": [
            ("📖", "经典中的经典", "晨星公司前股票研究主管多尔西系统拆解了「护城河」——什么是真正的竞争优势，什么只……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Pat Dorsey，著名投资人和思想家，其著作深刻影响了全球投资界。本书是economic-moat的核心著作。",
        "roadmap_intro": "全书17个精读单元分为4个模块。建议按模块顺序阅读，先建立护城河认知框架，再深入分析工具与实战案例。",
        "roadmap_modules": [
            {"num": "模块1", "title": "护城河思维框架 ⭐基础", "pages": "Ch1-4 · 从经济护城河定义出发，理解其决定公司价值的逻辑，并学会识别虚假护城河陷阱。"},
            {"num": "模块2", "title": "护城河的五种来源 ⭐核心", "pages": "Ch5-9 · 深入剖析品牌专利、转换成本、网络效应、成本优势及规模优势，掌握持久竞争优势的识别方法。"},
            {"num": "模块3", "title": "护城河的动态与行业应用", "pages": "Ch10-13 · 分析护城河如何被侵蚀，聚焦正确行业，评估管理层价值，并通过五家公司实战案例巩固分析能力。"},
            {"num": "模块4", "title": "估值、交易与投资智慧", "pages": "Ch14-17 · 学习估值工具寻找打折股票，明确卖出时机，并提炼超越数字的投资哲学。"}
        ],
    },

    "fooled-by-randomness": {
        "title": "随机漫步的傻瓜", "author": "纳西姆·塔勒布", "author_en": "Nassim Nicholas Taleb",
        "year": "2001", "domain_cn": "不确定性与风险", "domain_key": "uncertainty",
        "chapter_file": "fooled-by-randomness.json",
        "cover_gradient": "linear-gradient(135deg, #2a1a1a 0%, #1a0d0d 50%, #0d0505 100%)",
        "cover_text": "Fooled by\nRandomness",
        "author_initials": "NT",
        "subtitle": "运气与技巧的真相",
        "desc": "塔勒布「不确定性」三部曲的第一部。核心观点极其简单却极其深刻：我们严重低估了随机性在成功（和失败）中的作用。那些看起来「有本事」的交易员，往往只是运气好——而运气总会用完。",
        "why_items": [
            ("📖", "经典中的经典", "塔勒布「不确定性」三部曲的第一部。核心观点极其简单却极其深刻：我们严重低估了随机……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Nassim Nicholas Taleb，著名投资人和思想家，其著作深刻影响了全球投资界。本书是fooled-by-randomness的核心著作。",
        "roadmap_intro": "全书20个精读单元分为4个模块。建议从认知基础出发，逐步深入概率思维与心理陷阱，最终掌握对抗随机性的策略。",
        "roadmap_modules": [
            {"num": "模块1", "title": "认知基础与随机性本质 ⭐基础", "pages": "Ch1-4 · 建立随机性认知框架，理解认知谦卑、另类历史、运气伪装及黑天鹅的警示"},
            {"num": "模块2", "title": "概率思维与幸存者偏差 ⭐核心", "pages": "Ch5-9 · 深入幸存者偏差、结果导向谬误、蒙特卡洛模拟及伪思考识别，强化概率视角"},
            {"num": "模块3", "title": "偏态、归纳陷阱与数据挖掘", "pages": "Ch10-15 · 探讨偏态不对称性、归纳法陷阱、猴子打字机、幸存者偏差表现及非线性胜者通吃"},
            {"num": "模块4", "title": "心理陷阱与对抗策略", "pages": "Ch16-20 · 分析概率盲、赌徒迷信，并用策略、怀疑主义与斯多葛哲学驯服情绪对抗随机性"}
        ],
    },

    "intelligent-investor": {
        "title": "聪明的投资者", "author": "本杰明·格雷厄姆", "author_en": "Benjamin Graham",
        "year": "1949", "domain_cn": "资产估值", "domain_key": "valuation",
        "chapter_file": "intelligent-investor.json",
        "cover_gradient": "linear-gradient(135deg, #2a3a3a 0%, #1a2a2a 50%, #0a1515 100%)",
        "cover_text": "The Intelligent\nInvestor",
        "author_initials": "BG",
        "subtitle": "价值投资的圣经",
        "desc": "巴菲特称这本书为「有史以来最好的投资书」。格雷厄姆定义了投资与投机的区别、安全边际的概念、市场先生的比喻——这三个概念构成了价值投资的全部基石。第8章和第20章是全书核心。",
        "why_items": [
            ("📖", "经典中的经典", "巴菲特称这本书为「有史以来最好的投资书」。格雷厄姆定义了投资与投机的区别、安全边……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Benjamin Graham，著名投资人和思想家，其著作深刻影响了全球投资界。本书是intelligent-investor的核心著作。",
        "roadmap_intro": "全书47章分为4个模块，建议按顺序阅读：先建立投资思维框架，再理解市场与历史，接着学习实战策略，最后掌握风险控制与终极智慧。",
        "roadmap_modules": [
            {"num": "模块1", "title": "思维框架与投资哲学 ⭐基础", "pages": "Ch1-6 · 涵盖巴菲特序言、格雷厄姆四大基石、投资与投机的本质区别，以及投资者自我认知与情绪纪律。"},
            {"num": "模块2", "title": "市场环境与历史启示", "pages": "Ch7-10 · 分析通胀对股票投资的影响、百年股市历史数据与估值启示，以及历史与现实之间的鸿沟。"},
            {"num": "模块3", "title": "实战策略与选股方法 ⭐核心", "pages": "Ch11-34 · 防御型与进取型投资者的资产配置、选股标准、负面清单、指数基金、顾问关系、证券分析及企业本质判断。"},
            {"num": "模块4", "title": "风险控制与终极智慧", "pages": "Ch35-47 · 可转换证券与期权陷阱、极端案例教训、股东权利、安全边际核心概念、超级投资者案例及注释解析。"}
        ],
    },

    "market-cycle": {
        "title": "周期", "author": "霍华德·马克斯", "author_en": "Howard Marks",
        "year": "2018", "domain_cn": "周期与市场", "domain_key": "cycle",
        "chapter_file": "market-cycle.json",
        "cover_gradient": "linear-gradient(135deg, #1a2a4a 0%, #0d1830 50%, #050c18 100%)",
        "cover_text": "Mastering\nthe Market\nCycle",
        "author_initials": "HM",
        "subtitle": "投资中最重要的事（续篇）",
        "desc": "马克斯专门写了这本书来展开《投资最重要的事》中最关键的一个概念——周期。信贷周期、经济周期、心理周期的同向共振和三阶段理论，配以橡树资本在2008年危机中精准布局的实战经验。",
        "why_items": [
            ("📖", "经典中的经典", "马克斯专门写了这本书来展开《投资最重要的事》中最关键的一个概念——周期。信贷周期……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Howard Marks，著名投资人和思想家，其著作深刻影响了全球投资界。本书是market-cycle的核心著作。",
        "roadmap_intro": "全书20章分为4个模块，建议按顺序阅读：先理解周期本质，再分析经济与信贷，最后掌握心理与应对策略。",
        "roadmap_modules": [
            {"num": "模块1", "title": "周期基础与本质 ⭐基础", "pages": "Ch1-4 · 介绍周期的定义、根本原因、运行规律及规律性与随机性的辩证关系"},
            {"num": "模块2", "title": "经济与信贷周期 ⭐核心", "pages": "Ch5-7 · 分析经济长短期周期、政府央行管理手段、利润周期的放大效应"},
            {"num": "模块3", "title": "心理与市场波动", "pages": "Ch8-12 · 探讨投资者心理钟摆、风险态度、信贷周期、不良债权及房地产周期的独特波动"},
            {"num": "模块4", "title": "综合应对与智慧", "pages": "Ch13-20 · 整合市场周期心理驱动，提供定位艺术、应对局限、成功陷阱及周期永恒性的总结"}
        ],
    },

    "peter-lynch": {
        "title": "彼得·林奇的成功投资", "author": "彼得·林奇", "author_en": "Peter Lynch",
        "year": "1989", "domain_cn": "商业认知", "domain_key": "business",
        "chapter_file": "peter-lynch.json",
        "cover_gradient": "linear-gradient(135deg, #2a2a1a 0%, #1a1a0d 50%, #0d0d05 100%)",
        "cover_text": "One Up on\nWall Street",
        "author_initials": "PL",
        "subtitle": "业余投资者的选股圣经",
        "desc": "彼得·林奇用最通俗的语言解释了如何通过日常观察找到十倍股。他把股票分为六种类型（缓慢增长型、稳定增长型、快速增长型、周期型、困境反转型、隐蔽资产型），每种类型有不同的选股逻辑和卖出时机。",
        "why_items": [
            ("📖", "经典中的经典", "彼得·林奇用最通俗的语言解释了如何通过日常观察找到十倍股。他把股票分为六种类型（……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Peter Lynch，著名投资人和思想家，其著作深刻影响了全球投资界。本书是peter-lynch的核心著作。",
        "roadmap_intro": "全书20个精读单元分为4个模块。建议按模块顺序阅读，先建立投资思维框架，再掌握实战选股与卖出策略，最后理解风险与历史启示。",
        "roadmap_modules": [
            {"num": "模块1", "title": "投资思维框架 ⭐基础", "pages": "Ch1-4 · 从业余投资者定位出发，理解投资理念的进化、日常观察发现牛股的方法，以及从球童到大师的成长路径。"},
            {"num": "模块2", "title": "机构与市场的真相", "pages": "Ch5-7 · 剖析理论与实践的背离、机构投资的集体思维陷阱，以及投资与赌博的本质区别。"},
            {"num": "模块3", "title": "实战选股与卖出策略 ⭐核心", "pages": "Ch8-18 · 系统学习六种股票分类、13条选股准则、警惕多元恶化与耳语股陷阱，掌握收益锚点、竞争对手挖掘、负债分析、隐形财富核查、公司阶段识别、六类公司分析要点，以及卖出时机的回归逻辑。"},
            {"num": "模块4", "title": "风险警示与历史启示", "pages": "Ch19-20 · 明确期权期货的赌博本质，并从历史事件中汲取投资信心与教训。"}
        ],
    },

    "poor-charlie": {
        "title": "穷查理宝典", "author": "查理·芒格", "author_en": "Charles T. Munger",
        "year": "2005", "domain_cn": "心性与哲学", "domain_key": "mind",
        "chapter_file": "poor-charlie.json",
        "cover_gradient": "linear-gradient(135deg, #3a2a1a 0%, #2a1a0d 50%, #150d05 100%)",
        "cover_text": "Poor Charlie's\nAlmanack",
        "author_initials": "CM",
        "subtitle": "查理·芒格的智慧箴言",
        "desc": "这本书是理解芒格思想的必读之作。核心内容为芒格在1994-1998年间的11篇演讲，涵盖多元思维模型、人类误判心理学、投资检查清单等。如果你想培养跨学科思考能力，这本书是最好的起点。",
        "why_items": [
            ("📖", "经典中的经典", "这本书是理解芒格思想的必读之作。核心内容为芒格在1994-1998年间的11篇演……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Charles T. Munger，著名投资人和思想家，其著作深刻影响了全球投资界。本书是poor-charlie的核心著作。",
        "roadmap_intro": "全书33个精读单元分为4个模块。建议从基础理念入手，逐步深入思维模型、心理倾向与实战案例，最终回归智慧总结。",
        "roadmap_modules": [
            {"num": "模块1", "title": "价值投资与芒格智慧 ⭐基础", "pages": "Ch1-5 · 价值投资启蒙、逆向思维、芒格生平、西塞罗《论老年》及家庭教育智慧"},
            {"num": "模块2", "title": "多元思维与投资哲学 ⭐核心", "pages": "Ch6-14 · 多元思维模型、能力圈与护城河、伯克希尔哲学、集中投资、逆向思维及跨学科选股"},
            {"num": "模块3", "title": "心理倾向与行为陷阱", "pages": "Ch15-26 · 慈善投资反思、财富效应、金融丑闻、经济学批判、25种心理倾向及激励机制、损失厌恶等实战应用"},
            {"num": "模块4", "title": "智慧总结与体系解析", "pages": "Ch27-33 · 捐赠科学中心、巴菲特与芒格合伙、经济崩溃寓言、伯克希尔体系、芒格书单及一生智慧"}
        ],
    },

    "security-analysis": {
        "title": "证券分析", "author": "本杰明·格雷厄姆", "author_en": "Benjamin Graham",
        "year": "1934", "domain_cn": "资产估值", "domain_key": "valuation",
        "chapter_file": "security-analysis.json",
        "cover_gradient": "linear-gradient(135deg, #1a1a2a 0%, #0d0d1a 50%, #05050d 100%)",
        "cover_text": "Security\nAnalysis",
        "author_initials": "BG",
        "subtitle": "价值投资的开山之作",
        "desc": "1934年出版的《证券分析》是价值投资的奠基之作。格雷厄姆和大卫·多德首次系统性地提出了以企业内在价值为基础的证券分析方法。这本书定义了后来一百年的投资分析范式，是一本教科书，不是一本轻松的读物。",
        "why_items": [
            ("📖", "经典中的经典", "1934年出版的《证券分析》是价值投资的奠基之作。格雷厄姆和大卫·多德首次系统性……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Benjamin Graham，著名投资人和思想家，其著作深刻影响了全球投资界。本书是security-analysis的核心著作。",
        "roadmap_intro": "全书50个精读单元分为4个模块。建议按模块顺序阅读，从基础理念到实战分析，逐步构建价值投资体系。",
        "roadmap_modules": [
            {"num": "模块1", "title": "价值投资哲学与历史演变 ⭐基础", "pages": "Ch1-5 · 探讨价值投资的永恒智慧、时代背景、投资与投机的根本分野，奠定核心理念基础。"},
            {"num": "模块2", "title": "内在价值与分析方法 ⭐核心", "pages": "Ch6-9 · 深入内在价值的边界、定量与定性分析、信息批判性分析，明确投资与投机的本质区分。"},
            {"num": "模块3", "title": "固定收益与优先证券投资策略", "pages": "Ch10-34 · 系统分析债券、优先股、收益债券、担保债券、特权证券等固定价值投资的原则、安全边际、保护条款及危机应对。"},
            {"num": "模块4", "title": "普通股投资与财务分析实战", "pages": "Ch35-50 · 聚焦股票作为高收益债券的视角、股息政策、损益表陷阱、折旧摊销、市盈率上限等核心财务分析与投资准则。"}
        ],
    },

    "stock-operator": {
        "title": "股票大作手回忆录", "author": "埃德温·勒菲弗", "author_en": "Edwin Lefevre",
        "year": "1923", "domain_cn": "心性与哲学", "domain_key": "mind",
        "chapter_file": "stock-operator.json",
        "cover_gradient": "linear-gradient(135deg, #2a1a1a 0%, #1a0d0d 50%, #0d0505 100%)",
        "cover_text": "Reminiscences\nof a Stock\nOperator",
        "author_initials": "EL",
        "subtitle": "杰西·利弗莫尔的传奇人生",
        "desc": "以杰西·利弗莫尔为原型的半自传体小说，被誉为「交易者的圣经」。利弗莫尔从14岁在一家投机商行做报价员起步，最终成为华尔街最具争议的个人交易者。书中关于市场心理、趋势判断和仓位管理的洞见，一百年后依然有效。",
        "why_items": [
            ("📖", "经典中的经典", "以杰西·利弗莫尔为原型的半自传体小说，被誉为「交易者的圣经」。利弗莫尔从14岁在……"),
            ("💡", "投资实战价值", "这本书提供的框架和思维方式可以直接应用于投资决策。"),
            ("🎯", "必读理由", "被全球投资者和基金经理反复推荐，经得起时间检验。"),
        ],
        "author_bio": "Edwin Lefevre，著名投资人和思想家，其著作深刻影响了全球投资界。本书是stock-operator的核心著作。",
        "roadmap_intro": "全书47个精读单元分为4个模块。建议按顺序阅读，从投机启蒙到专业交易，逐步理解市场心理与操作原则。",
        "roadmap_modules": [
            {"num": "模块1", "title": "投机启蒙与市场初探 ⭐基础", "pages": "Ch1-8 · 从少年赌客到交易所，学习对赌行、时机与价格的关系，建立市场测试意识"},
            {"num": "模块2", "title": "心理陷阱与自我克制 ⭐核心", "pages": "Ch9-18 · 从投机到投资蜕变，探讨内幕消息、最小阻力线、战略撤退与破产重生的心理博弈"},
            {"num": "模块3", "title": "操纵艺术与市场原则", "pages": "Ch19-28 · 深入炒作、轧空、坐庄手法，揭示内线操控与反向操作，回归市场正确性"},
            {"num": "模块4", "title": "专业交易与终极蜕变", "pages": "Ch29-47 · 从直觉交易到趋势交易，掌握最小阻力方向、独立判断与承销困局，完成投机者到交易者的升华"}
        ],
    }
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
10. quote_en 必须同时输出对应英文原句（从epub原文中找到，中文译本也请从英文原书中查找对应的英文原句）。如果确实找不到英文原句，填写 "N/A"，不要留空
11. terms 字段中每个术语的 en 字段必须为非空英文缩写或术语（如DCF/PE/Moat/Scuttlebutt Method），不要留空
12. preview_concept、preview_question、preview_oneline 三个字段都必须填写，构成完整的章节预览
13. 输出必须是严格的JSON格式，不要有任何额外文字
14. 禁止在中文内容中使用括号附带英文术语注记（如"闲聊法（Scuttlebutt Method）"）。术语只输出纯中文，英文原文仅在 en-detail 折叠块和 terms.en 字段中出现"""


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
  "terms": [{{"en": "专业缩写如DCF/PE/Moat（必须非空！）", "zh": "中文术语名", "note": "解读"}}],
  "takeaways": ["要点1", "要点2", "要点3"],
  "exercises": [
    {{"q": "思考题（联系实际投资决策，内容简单可留空数组）", "hint": "提示", "ai_first_reply": "AI初始回复"}}
  ],
  "quote": "从原文中精确摘录一句最有洞察力的中文原文（50-150字）",
  "quote_en": "对应的英文原句（从epub英文原书查找，中文译本也请尽量找到英文对应句。确实找不到则填 N/A）",
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


def build_chapter_html(ch, num, book_title, is_first=False):
    """根据JSON数据构建标准章节HTML"""
    if ch is None:
        return ""

    # Preview（最少1项关键概念，有数据时最多3项）
    preview_concept = ch.get("preview_concept", "")
    preview_question = ch.get("preview_question", "")
    preview_oneline = ch.get("preview_oneline", "")
    preview_items = f'<div class="preview-item"><span class="preview-label">🔑 关键概念：</span><span class="preview-text">{preview_concept}</span></div>'
    if preview_question:
        preview_items += f'\n      <div class="preview-item"><span class="preview-label">🎯 核心问题：</span><span class="preview-text">{preview_question}</span></div>'
    if preview_oneline:
        preview_items += f'\n      <div class="preview-item"><span class="preview-label">💡 一句话：</span><span class="preview-text">{preview_oneline}</span></div>'
    preview = f'''    <div class="chapter-preview">
      {preview_items}
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
      <div class="block-label"><span class="dot" style="background:var(--counter)"></span> ⚔️ 反方观点</div>
      <div class="counter-box"><p>{counter}</p></div>
    </div>''')

    # 中国市场
    china = ch.get("china_link", "")
    if china:
        blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:var(--china)"></span> 🇨🇳 中国市场关联</div>
      <div class="china-box"><p>{china}</p></div>
    </div>''')

    # 术语表（后处理：过滤掉 en 字段为空的术语）
    terms = ch.get("terms", [])
    terms = [t for t in terms if t.get("en", "").strip() and t["en"] != "N/A"]
    if terms:
        terms_html = "".join(
            f'<tr><td><strong>{t["en"]}</strong></td><td class="zh">{t["zh"]}</td><td>{t.get("note", "")}</td></tr>'
            for t in terms
        )
        blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:var(--purple)"></span> 📊 关键术语词典</div>
      <table class="term-table">
        <tr><th>英文</th><th>中文</th><th>精读解读</th></tr>
{terms_html}      </table>
    </div>''')

    # 要点总结
    takeaways = ch.get("takeaways", [])
    if takeaways:
        items = "".join(f'<li>{t}</li>' for t in takeaways)
        blocks.append(f'''    <div class="block">
      <div class="block-label"><span class="dot" style="background:var(--accent)"></span> 💡 本章要点总结</div>
      <ul class="takeaway-list">{items}</ul>
    </div>''')

    # 思考题 + chat-widget（V3.5 规则：每章至少一个 chat-widget，嵌入 exercise-box 内）
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
    ch_title = subtitle if subtitle else f"第{num}章"
    # 首章 id="intro"（导航 #intro 锚点），其余章节 id="ch{num}"
    article_id = 'id="intro"' if is_first else f'id="ch{num}"'

    return f'''  <article class="chapter-card" {article_id} aria-labelledby="ch{num}-title">
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

    # 导航链接（首章 id="intro" 已单独列出，从第2章开始）
    nav_links = ""
    for num, ch in valid_chapters[1:]:  # 跳过首章
        subtitle_text = ch.get("subtitle", f"第{num}章")
        nav_links += f'<a href="#ch{num}">第{num}章</a>\n'

    # 章节HTML（首章同时带 id="intro"）
    chapter_html = "\n".join(
        build_chapter_html(ch, num, title, is_first=(i == 0))
        for i, (num, ch) in enumerate(valid_chapters)
    )

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
        f'    <div class="part-card{" current" if i == 0 else ""}">\n'
        f'      <div class="part-num">📖 {m["num"]}</div>\n'
        f'      <h3 class="part-title">{m["title"]}</h3>\n'
        f'      <div class="part-pages">{m["pages"]}</div>\n'
        f'    </div>'
        for i, m in enumerate(roadmap_modules)
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
{{"@context":"https://schema.org","@type":"Book","name":"{title}","author":{{"@type":"Person","name":"{author}"}},"inLanguage":"zh","datePublished":"{year}","description":"{desc[:250]}"}}
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
  <div class="cover" aria-hidden="true" style="--cover-grad: {cover_gradient}; background: var(--cover-grad);">{cover_text}</div>
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
  <div class="progress-bar"><div class="fill" id="progress-fill"></div></div>
  <div class="progress-text">阅读进度：<span id="progress-percent">0%</span> · <span id="progress-chapters">0/{total}</span> 章</div>
</div>

<!-- CHAPTERS -->
{chapter_html}

<footer>
  <p>📚 AI精读笔记 · 《{title}》{total}章精读</p>
  <p><a href="../../bookshelf.html" style="color:var(--accent);">← 返回完整书架</a></p>
</footer>

</div>
<button class="back-to-top" onclick="window.scrollTo({{top:0,behavior:'smooth'}})">⬆</button>
<script src="../../assets/js/data_v2.js"></script>
<script src="../../assets/js/app.js"></script>
<script src="../../assets/js/local-auth.js"></script>
<script src="../../assets/js/supabase-auth.js"></script>
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

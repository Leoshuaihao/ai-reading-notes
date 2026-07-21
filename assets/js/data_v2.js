/**
 * AI精读笔记 — 数据层 V2
 *
 * 三层注册中心架构：
 *   BOOK_REGISTRY  → 概念归属 + 领域路径 + 人设信息（单一真实来源）
 *   CONCEPTS       → 纯粹的概念定义（无 books[] 字段）
 *   KNOWLEDGE_POINTS → 多书关联的知识点训练数据
 *
 * 查询引擎 QueryEngine 提供纯 JS 查询，无需后端
 *
 * 使用方式：
 *   <script src="../../assets/js/data_v2.js"></script>
 *   <script>
 *     var bookConcepts = AppDataV2.getBookConcepts('fisher');
 *     var conceptBooks = AppDataV2.getConceptBooks('intrinsic-value');
 *     var promptInfo = AppDataV2.getBookPromptInfo('fisher');
 *   </script>
 */
var AppDataV2 = (function() {
  'use strict';

  // =============================================================================
  // 第一层：BOOK_REGISTRY — 全部17本书的单一真实来源
  // =============================================================================

  var BOOK_REGISTRY = {
    'most-important-thing': {
      basic: {
        slug: 'most-important-thing',
        title: '投资最重要的事',
        author: { name: 'Howard Marks', nameCN: '霍华德·马克斯', role: '橡树资本联合创始人' },
        chapters: 22,
        school: 'cycle',
        schoolName: '周期'
      },
      conceptMappings: [
        { id: 'risk', chapters: [5,6,7], usage: '马克斯对风险的重新定义是全书的基石：风险不是波动性，而是永久性损失的概率。他用三章逐层分析：理解风险的来源、识别风险的信号、控制风险的方法。', stance: 'proponent' },
        { id: 'cycle', chapters: [8,9], usage: '第8-9章是马克斯周期理论的核心：关注信贷/心理/估值三个周期的同向共振。钟摆理论——市场在恐惧和贪婪间永恒摇摆，极端位置才是机会。', stance: 'proponent' },
        { id: 'contrarian', chapters: [11,12,13], usage: '第11章给出逆向投资的三个条件：不同、正确、敢行动。光逆向不够——你必须是对的。第12-13章教你如何等待便宜货和最佳时机。', stance: 'proponent' },
        { id: 'margin-of-safety', chapters: [4,12], usage: '马克斯版安全边际：价格是你付出的，价值是你得到的。第4章讲价格与价值的关系，第12章讲如何寻找便宜货。', stance: 'proponent' },
        { id: 'misjudgment', chapters: [10], usage: '第10章系统分析了七种投资心理陷阱：贪婪、恐惧、从众、嫉妒、自负、投降、盲从。每种都配橡树资本的真实案例。', stance: 'proponent' },
        { id: 'concentration', chapters: [17,18], usage: '第17章讨论多元化投资的边界——分散到什么程度才算合理？第18章分析避免重大错误比追求超额收益更重要。', stance: 'extender' },
      ],
      domainPath: {
        primary: { key: 'cycle', level: 2 },
        cross: [
          { key: 'valuation', chapter: 3, label: '第3章「准确估计价值」' },
          { key: 'mind', chapter: 10, label: '第10章「抵御消极影响」' }
        ]
      },
      promptInfo: {
        persona: '你是霍华德·马克斯，橡树资本的联合创始人。你花了三十年写投资备忘录，被巴菲特称为"我第一时间打开阅读的邮件"。你的风格是温和但有深度——不说废话，每句话都有具体案例支撑。你特别关注风险、周期和逆向投资，认为大多数人亏损是因为在错误的时间做了正确的事。请用中文回复，语气像一个睿智的长者在分享他几十年实战的领悟。',
        tone: '温和而深刻，每个观点都有橡树资本的真实案例做支撑'
      }
    },
    'buffett-way': {
      basic: {
        slug: 'buffett-way',
        title: '巴菲特之道',
        author: { name: 'Robert G. Hagstrom', nameCN: '罗伯特·哈格斯特朗', role: '美盛基金经理、巴菲特方法论研究者' },
        chapters: 9,
        school: 'value',
        schoolName: '价值'
      },
      conceptMappings: [
        { id: 'intrinsic-value', chapters: [3,4], usage: '哈格斯特朗系统拆解了巴菲特估算内在价值的方法：所有者收益、DCF折现、一美元前提。强调模糊的正确胜过精确的错误。', stance: 'proponent' },
        { id: 'margin-of-safety', chapters: [3,4], usage: '巴菲特版安全边际：以合理价格买伟大企业。哈格斯特朗将此归纳为「市场原则」——内在价值与安全边际构成买入决策的双重门控。', stance: 'extender' },
        { id: 'moat', chapters: [2,3,4], usage: '哈格斯特朗将巴菲特的护城河思想提炼为企业三原则：简单易懂、持续经营历史、良好长期前景。护城河是12条原则中企业准则的核心。', stance: 'proponent' },
        { id: 'circle-of-competence', chapters: [2,3], usage: '书中详细分析了能力圈思想的三个来源：格雷厄姆的安全边际、费雪的深度调研、芒格的理性边界。强调巴菲特只投资自己能理解的企业。', stance: 'proponent' },
        { id: 'misjudgment', chapters: [6], usage: '第6章专门讲投资心理学：过度自信、损失厌恶、从众心理如何摧毁投资回报。哈格斯特朗引用了大量行为金融学研究成果来佐证巴菲特的性情优势。', stance: 'proponent' },
        { id: 'concentration', chapters: [5], usage: '第5章用凯利公式和概率论论证了集中投资的数学合理性。哈格斯特朗认为巴菲特的集中投资不是品味偏好，而是数学最优解。', stance: 'proponent' },
      ],
      domainPath: {
        primary: { key: 'valuation', level: 2 },
        cross: [
          { key: 'business', chapter: 3, label: '第3章「十二条永恒原则·企业准则」' },
          { key: 'mind', chapter: 6, label: '第6章「投资心理学」' }
        ]
      },
      promptInfo: {
        persona: '你是罗伯特·哈格斯特朗，《巴菲特之道》的作者，美盛基金高级基金经理。你花了30年系统研究巴菲特的投资方法，不是简单复述他的语录，而是从基金经理的实操视角拆解了他的决策逻辑。你强调12条原则是一个完整体系，不是可以挑选使用的菜单。请用中文回复，语气温和但有深度，像一位想帮你真正理解而非只是听故事的导师。',
        tone: '温和而严谨，像一位有耐心的基金经理在教你做研究'
      }
    },
    'fisher': {
      basic: {
        slug: 'fisher',
        title: '怎样选择成长股',
        author: { name: 'Philip A. Fisher', nameCN: '菲利普·费雪', role: '成长股投资之父' },
        chapters: 10,
        school: 'growth',
        schoolName: '成长'
      },
      conceptMappings: [
        {
          id: 'intrinsic-value',
          chapters: [3, 4, 5, 6],
          usage: '费雪通过15条原则系统性地评估企业内在价值，重点考察管理层的诚信、研发投入和长期成长潜力。他主张通过「闲聊法」深度调研，获取公开渠道无法得到的信息。',
          stance: 'extender'
        },
        {
          id: 'moat',
          chapters: [2, 3, 4],
          usage: '费雪认为真正的护城河来自持续的研发投入和优秀的销售组织，而非单纯的规模优势。他率先区分了「幸运且能干」与「能干所以幸运」两种企业护城河的来源。',
          stance: 'proponent'
        },
        {
          id: 'growth-stock',
          chapters: [1, 2, 3, 5, 6],
          usage: '费雪是成长股投资的奠基人，定义了寻找成长股的15条原则，涵盖管理层质量、研发能力、利润率趋势等维度。他强调识别能持续十年以上成长的企业，而非追逐短期热门股。',
          stance: 'proponent'
        },
        {
          id: 'concentration',
          chapters: [7, 8, 10],
          usage: '费雪主张集中投资于少数真正了解的优秀公司，认为过度分散只会稀释收益。他建议持有10-12只股票，但真正有信心的不超过5只，把精力集中在最确定的投资上。',
          stance: 'proponent'
        }
      ],
      domainPath: {
        primary: { key: 'business', level: 2 },
        cross: [
          { key: 'valuation', chapter: 3, label: '第3章「15条原则」' }
        ]
      },
      promptInfo: {
        persona: '你是Philip A. Fisher，成长股投资的奠基人，《怎样选择成长股》的作者。你的投资理念强调深度调研——通过「闲聊法」了解管理层、产品、研发和销售组织。你相信优秀的投资来自对公司内在价值的深刻理解，而非市场波动。',
        tone: '严谨细致，善于追问细节，鼓励深度思考而非表面判断'
      }
    },

    'market-cycle': {
      basic: {
        slug: 'market-cycle',
        title: '周期',
        author: { name: 'Howard Marks', nameCN: '霍华德·马克斯', role: '橡树资本联合创始人' },
        chapters: 19,
        school: 'cycle',
        schoolName: '周期'
      },
      conceptMappings: [
        {
          id: 'risk',
          chapters: [5, 6, 7, 12, 13],
          usage: '马克斯重新定义了风险——不是波动性，而是永久性损失的概率。他通过投资备忘录反复论证：风险是隐蔽的、定性的、不可量化的，投资者最大的错误是用历史数据预测未来风险。',
          stance: 'proponent'
        },
        {
          id: 'cycle',
          chapters: [1, 2, 3, 8, 9, 14],
          usage: '马克斯将钟摆作为周期的核心隐喻——市场在恐惧与贪婪之间永恒摇摆，极端不会持久，回归均值是必然。他将抽象的市场周期转化为可感知的信号系统，帮助投资者定位当前所处的周期位置。',
          stance: 'proponent'
        },
        {
          id: 'contrarian',
          chapters: [8, 9, 10, 15, 16],
          usage: '马克斯认为卓越的投资绩效来自逆向思维，但逆向本身只是起点——你必须「逆向且正确」。他系统阐述了如何识别群体极端情绪，以及何时做出与众不同的判断。',
          stance: 'proponent'
        }
      ],
      domainPath: {
        primary: { key: 'cycle', level: 2 },
        cross: [
          { key: 'mind', chapter: 8, label: '第8章「钟摆意识」' },
          { key: 'uncertainty', chapter: 8, label: '第8章「风险态度周期」' }
        ]
      },
      promptInfo: {
        persona: '你是Howard Marks，橡树资本联合创始人，《周期》和《投资最重要的事》的作者。你以投资备忘录闻名华尔街，擅长用通俗比喻（如钟摆、温度计）解释复杂的市场周期。你的投资哲学核心是：我们无法预测未来，但可以知道自己身处何处。',
        tone: '理性冷静，善于用比喻和故事讲道理，温和但有洞见'
      }
    },

    'buffett-letters': {
      basic: {
        slug: 'buffett-letters',
        title: '巴菲特致股东的信',
        author: { name: 'Warren Buffett', nameCN: '沃伦·巴菲特', role: '伯克希尔·哈撒韦董事长' },
        chapters: 13,
        school: 'value',
        schoolName: '价值'
      },
      conceptMappings: [
        {
          id: 'intrinsic-value',
          chapters: [1, 5, 11],
          usage: '巴菲特将内在价值定义为「企业未来现金流的折现值」，强调模糊的正确优于精确的错误。他通过股东信反复演示如何用DCF框架评估企业，但指出真正重要的不是数字而是商业判断。',
          stance: 'extender'
        },
        {
          id: 'margin-of-safety',
          chapters: [1, 3, 5],
          usage: '巴菲特继承了格雷厄姆的安全边际理念，但将其从净资产折扣扩展到对优质企业的成长性折价。他用「承重30吨的桥只开10吨的车」的比喻将抽象概念具体化。',
          stance: 'extender'
        },
        {
          id: 'mr-market',
          chapters: [6, 7, 12],
          usage: '巴菲特将市场先生的寓言发扬光大，教导投资者利用市场情绪而非被其左右。他强调市场是仆人而非向导，最好的买入机会正是在市场先生极度悲观时出现。',
          stance: 'extender'
        },
        {
          id: 'circle-of-competence',
          chapters: [2, 4, 10],
          usage: '巴菲特从自身实践提炼出能力圈概念——只投资你能理解的企业。他坦诚自己避开科技股正是因为承认不在能力圈内，这种自我认知的纪律比认知广度更重要。',
          stance: 'proponent'
        },
        {
          id: 'misjudgment',
          chapters: [6, 7, 12],
          usage: '巴菲特在股东信中频繁揭示投资者常见心理陷阱——从过度自信到从众行为。他与芒格形成互补：巴菲特从商业实践中验证偏误的影响，芒格从心理学理论中系统提炼。',
          stance: 'extender'
        }
      ],
      domainPath: {
        primary: { key: 'valuation', level: 3 },
        cross: [
          { key: 'mind', chapter: 6, label: '第6章「市场先生与波动」' }
        ]
      },
      promptInfo: {
        persona: '你是Warren Buffett，伯克希尔·哈撒韦董事长，有史以来最成功的投资者。你的投资风格融合了格雷厄姆的价值分析与费雪的成长股思维。你善于用简单比喻解释深刻的投资道理，强调耐心、纪律和常识。',
        tone: '平易近人、幽默风趣，用农场和桥的比喻讲大道理'
      }
    },

    'alchemy-finance': {
      basic: {
        slug: 'alchemy-finance',
        title: '金融炼金术',
        author: { name: 'George Soros', nameCN: '乔治·索罗斯', role: '量子基金创始人' },
        chapters: 13,
        school: 'cycle',
        schoolName: '周期'
      },
      conceptMappings: [],
      domainPath: {
        primary: { key: 'cycle', level: 3 },
        cross: []
      },
      promptInfo: {
        persona: '你是George Soros，量子基金创始人，全球最成功的宏观对冲基金管理者之一。你提出的「反身性」理论挑战了市场有效假说——市场价格不仅反映基本面，也会反过来影响基本面。你认为投资不是科学，而是哲学和直觉的结合。',
        tone: '哲学思辨，抽象而深刻，善于从认识论角度解构投资'
      }
    },

    'poor-charlie': {
      basic: {
        slug: 'poor-charlie',
        title: '穷查理宝典',
        author: { name: 'Charlie Munger', nameCN: '查理·芒格', role: '伯克希尔·哈撒韦副董事长' },
        chapters: 13,
        school: 'mind',
        schoolName: '心理'
      },
      conceptMappings: [
        {
          id: 'moat',
          chapters: [2, 4, 5],
          usage: '芒格将护城河概念从单纯的商业竞争力提升为「理解世界运作方式」的多维框架。他主张用多元思维模型识别真正的护城河，认为很多看似坚固的壁垒不过是「护城河里放了鲨鱼」的假象。',
          stance: 'extender'
        },
        {
          id: 'circle-of-competence',
          chapters: [2, 3, 6],
          usage: '芒格将能力圈与「知道自己会死在哪里就永远不去」的逆向思维结合。他强调边界意识——知道不该做什么比知道该做什么更重要，这是他与巴菲特共同的投资纪律核心。',
          stance: 'extender'
        },
        {
          id: 'misjudgment',
          chapters: [10, 11, 12],
          usage: '芒格是误判心理学的集大成者，系统归纳了25种心理偏误及其叠加共振效应。他的独创贡献在于揭示了多种偏误同时作用时的lollapalooza效应——放大倍数远超单个偏误的简单加总。',
          stance: 'proponent'
        },
        {
          id: 'concentration',
          chapters: [2, 4, 5],
          usage: '芒格是极端集中投资的坚定拥护者——「一生只需打20个孔」的比喻深刻影响了价值投资者。他批判现代投资组合理论的过度分散，认为真正优秀的投资机会极为稀缺，来了必须重仓。',
          stance: 'proponent'
        }
      ],
      domainPath: {
        primary: { key: 'mind', level: 2 },
        cross: [
          { key: 'valuation', chapter: 2, label: '第2章「投资原则检查清单」' }
        ]
      },
      promptInfo: {
        persona: '你是Charlie Munger，伯克希尔·哈撒韦副董事长，巴菲特的终身搭档。你以逆向思维、多元思维模型和辛辣的智慧闻名。你相信理解事物的反面比正面更重要，强调从多个学科汲取思维工具。',
        tone: '犀利直率，言简意赅，偶尔冒出令人深思的金句'
      }
    },

    'intelligent-investor': {
      basic: {
        slug: 'intelligent-investor',
        title: '聪明的投资者',
        author: { name: 'Benjamin Graham', nameCN: '本杰明·格雷厄姆', role: '价值投资之父' },
        chapters: 23,
        school: 'value',
        schoolName: '价值'
      },
      conceptMappings: [
        {
          id: 'intrinsic-value',
          chapters: [1, 2, 7, 8, 11],
          usage: '格雷厄姆开创了内在价值的概念，将投资与投机明确区分。他提出的「基于事实和分析的承诺」定义了价值投资的分析范式，是后来一切价值评估方法的原点。',
          stance: 'proponent'
        },
        {
          id: 'margin-of-safety',
          chapters: [14, 15, 20],
          usage: '格雷厄姆原创了安全边际原则——买价必须显著低于内在价值，差额即为安全缓冲。他用「为错误、厄运和不可预见的坏消息留出空间」的表述奠定了风险管理的基本理念。',
          stance: 'proponent'
        },
        {
          id: 'mr-market',
          chapters: [8],
          usage: '格雷厄姆创造了市场先生的寓言——一个每天给你报价但情绪极不稳定的商业伙伴。这个比喻至今仍是理解市场波动最优雅的思维模型，是整个价值投资体系的精神支柱。',
          stance: 'proponent'
        },
        {
          id: 'risk',
          chapters: [1, 2, 8, 20],
          usage: '格雷厄姆区分了投资与投机，将「本金安全」作为投资的必要条件。他指出风险来自过高的购买价格和对企业理解的不充分，而非股价波动本身——这一洞见至今仍被低估。',
          stance: 'proponent'
        },
        {
          id: 'contrarian',
          chapters: [1, 8, 20],
          usage: '格雷厄姆教义的本质就是逆向——当市场先生极度悲观时买入，当价格回归价值时卖出。他开创的「净净股票」（低于净流动资产）策略就是在极端悲观中寻找价值的极致实践。',
          stance: 'proponent'
        },
        {
          id: 'concentration',
          chapters: [7, 14, 15],
          usage: '格雷厄姆偏好在低估值标的中的广泛分散——同时持有数十只低PB股票来分散个别判断错误的风险。这种分散化策略是「防御型投资者」的核心特征，与费雪和芒格的集中主义形成鲜明对比。',
          stance: 'proponent'
        }
      ],
      domainPath: {
        primary: { key: 'valuation', level: 1 },
        cross: [
          { key: 'business', chapter: 20, label: '第20章「安全边际」' },
          { key: 'mind', chapter: 8, label: '第8章「市场先生」' }
        ]
      },
      promptInfo: {
        persona: '你是Benjamin Graham，哥伦比亚商学院教授，被誉为价值投资之父，《聪明的投资者》被称为「投资圣经」。你教导投资者区分投资与投机，把市场当作情绪化的报价员而非智慧的向导。',
        tone: '严谨学术，逻辑清晰，如一位耐心的商学院教授循循善诱'
      }
    },

    'security-analysis': {
      basic: {
        slug: 'security-analysis',
        title: '证券分析',
        author: { name: 'Benjamin Graham', nameCN: '本杰明·格雷厄姆', role: '价值投资之父' },
        chapters: 19,
        school: 'value',
        schoolName: '价值'
      },
      conceptMappings: [
        {
          id: 'intrinsic-value',
          chapters: [1, 2, 3, 4],
          usage: '这部巨著是对内在价值最系统的教科书式阐述，覆盖了债券、优先股和普通股的完整分析框架。格雷厄姆展示了如何从资产负债表和利润表中提炼出企业的真实经济价值。',
          stance: 'proponent'
        },
        {
          id: 'margin-of-safety',
          chapters: [1, 3, 4],
          usage: '格雷厄姆在导言中将安全边际定义为投资的「中心概念」，并提供了固定收益证券和普通股两个维度的具体计算框架。这部千页巨著是价值投资的方法论奠基之作。',
          stance: 'proponent'
        }
      ],
      domainPath: {
        primary: { key: 'valuation', level: 3 },
        cross: [
          { key: 'uncertainty', chapter: 1, label: '导言「安全边际」' }
        ]
      },
      promptInfo: {
        persona: '你是Benjamin Graham，专业证券分析师，《证券分析》合著者。你以严谨的财务报表分析和数学化的估值方法闻名，将投资从一种猜测转变为一种专业。你认为每一笔投资决策都必须有充分的事实依据。',
        tone: '严谨专业，注重数字和逻辑推导，如一位资深分析师'
      }
    },

    'peter-lynch': {
      basic: {
        slug: 'peter-lynch',
        title: '彼得·林奇的成功投资',
        author: { name: 'Peter Lynch', nameCN: '彼得·林奇', role: '传奇基金经理' },
        chapters: 22,
        school: 'growth',
        schoolName: '成长'
      },
      conceptMappings: [
        {
          id: 'circle-of-competence',
          chapters: [1, 2, 3, 6, 7],
          usage: '林奇将能力圈转化为「从生活中发现股票」的实用方法——你逛的商场、使用的产品、了解的行业就是最好的研究起点。他证明了个人投资者在特定领域的认知优势可以战胜专业机构。',
          stance: 'extender'
        },
        {
          id: 'growth-stock',
          chapters: [6, 7, 8, 9, 10, 11],
          usage: '林奇用六种公司类型（慢速成长、稳健成长、快速成长、周期型、转型困境、隐蔽资产）重新定义了成长股分类。他提出的PEG指标（市盈率/增长率）至今仍是成长股估值的经典工具。',
          stance: 'extender'
        },
        {
          id: 'concentration',
          chapters: [13, 14, 15],
          usage: '林奇在实践中走向了与费雪不同的路径——他管理的麦哲伦基金曾持有超过1000只股票。但他主张个人投资者应集中精力研究少数公司，这种个人与机构的分层策略在集中/分散辩论中独树一帜。',
          stance: 'critic'
        }
      ],
      domainPath: {
        primary: { key: 'business', level: 1 },
        cross: []
      },
      promptInfo: {
        persona: '你是Peter Lynch，传奇基金经理，曾管理麦哲伦基金取得29%的年化回报。你的投资方法亲民而实用，主张普通投资者拥有远超机构的认知优势——因为他们从日常生活中就能发现优秀公司。',
        tone: '亲切随和，用日常生活中的例子说明投资道理，通俗易懂'
      }
    },

    'beating-street': {
      basic: {
        slug: 'beating-street',
        title: '战胜华尔街',
        author: { name: 'Peter Lynch', nameCN: '彼得·林奇', role: '传奇基金经理' },
        chapters: 15,
        school: 'growth',
        schoolName: '成长'
      },
      conceptMappings: [],
      domainPath: {
        primary: { key: 'business', level: 1 },
        cross: []
      },
      promptInfo: {
        persona: '你是Peter Lynch，曾连续13年战胜市场的传奇基金经理。《战胜华尔街》记录了你管理麦哲伦基金的真实投资案例，展示了如何将「从生活中发现股票」的理念应用于实战。',
        tone: '实战导向，分享具体案例和经验教训，鼓励独立思考'
      }
    },

    'black-swan': {
      basic: {
        slug: 'black-swan',
        title: '黑天鹅',
        author: { name: 'Nassim Taleb', nameCN: '纳西姆·塔勒布', role: '不确定性哲学家' },
        chapters: 19,
        school: 'uncertainty',
        schoolName: '不确定'
      },
      conceptMappings: [
        {
          id: 'black-swan',
          chapters: [1, 4, 6, 7, 9, 12, 17],
          usage: '塔勒布原创了黑天鹅理论——罕见、高影响、事后可解释的极端事件塑造了历史。他通过批判金融模型对钟形曲线的依赖，揭示了真实世界的肥尾分布——极端事件的发生概率被系统性低估。',
          stance: 'proponent'
        }
      ],
      domainPath: {
        primary: { key: 'uncertainty', level: 3 },
        cross: []
      },
      promptInfo: {
        persona: '你是Nassim Taleb，《黑天鹅》作者，不确定性理论的哲学家。你尖锐地批判了金融界用数学假装管理风险的行为，指出真正重要的事件从来分布在历史数据之外。你的思想核心是：准备应对无法预测的事。',
        tone: '尖锐反叛，挑战常识，不畏惧指出整个行业的集体错误'
      }
    },

    'antifragile': {
      basic: {
        slug: 'antifragile',
        title: '反脆弱',
        author: { name: 'Nassim Taleb', nameCN: '纳西姆·塔勒布', role: '不确定性哲学家' },
        chapters: 24,
        school: 'uncertainty',
        schoolName: '不确定'
      },
      conceptMappings: [
        {
          id: 'margin-of-safety',
          chapters: [2, 6, 11, 12],
          usage: '塔勒布将安全边际重新定义为「负凸性的对冲」——不是单纯留出缓冲区，而是构建在极端下跌时损失有限、在极端上涨时收益无限的杠铃结构。他将格雷厄姆的理念升维为非线性思维的框架。',
          stance: 'extender'
        },
        {
          id: 'risk',
          chapters: [4, 5, 6, 7, 18],
          usage: '塔勒布从认识论角度重新定义了风险——真正的风险在于你「不知道自己不知道的事」。他指出专家的风险管理模型本身就是风险的来源，因为它们在极端事件前完全失效，反而制造了虚假的安全感。',
          stance: 'extender'
        },
        {
          id: 'black-swan',
          chapters: [1, 2, 3, 6, 11, 17, 18],
          usage: '反脆弱是黑天鹅三部曲的终章，将理论从「如何防范黑天鹅」升级为「如何从黑天鹅中获益」。塔勒布提出杠铃策略——90%极度保守+10%极度激进——是对黑天鹅最务实的应对方案。',
          stance: 'extender'
        }
      ],
      domainPath: {
        primary: { key: 'uncertainty', level: 4 },
        cross: [
          { key: 'cycle', chapter: 11, label: '第11章「杠铃策略」' }
        ]
      },
      promptInfo: {
        persona: '你是Nassim Taleb，《反脆弱》作者。你引入了一个全新概念——不仅能够抵抗冲击，还能从混乱中获益的系统特性。你批判现代金融机构的脆弱性，鼓吹构建能利用波动的投资组合。',
        tone: '哲学思辨，锋芒毕露，喜欢用古典智慧和格言反驳主流观点'
      }
    },

    'fooled-by-randomness': {
      basic: {
        slug: 'fooled-by-randomness',
        title: '随机漫步的傻瓜',
        author: { name: 'Nassim Taleb', nameCN: '纳西姆·塔勒布', role: '不确定性哲学家' },
        chapters: 14,
        school: 'uncertainty',
        schoolName: '不确定'
      },
      conceptMappings: [],
      domainPath: {
        primary: { key: 'uncertainty', level: 3 },
        cross: []
      },
      promptInfo: {
        persona: '你是Nassim Taleb，《随机漫步的傻瓜》作者。你在这部处女作中首次系统阐述了人类将随机性误解为技能的认知偏差。金融市场上无数「跑赢市场」的案例其实只是统计噪音——足够多的猴子中总有一只能连续掷出正面。',
        tone: '讽刺尖锐，用生动的思想实验揭露「幸存者偏差」的谬误'
      }
    },

    'random-walk': {
      basic: {
        slug: 'random-walk',
        title: '漫步华尔街',
        author: { name: 'Burton Malkiel', nameCN: '伯顿·麦基尔', role: '普林斯顿大学经济学教授' },
        chapters: 15,
        school: 'uncertainty',
        schoolName: '不确定'
      },
      conceptMappings: [],
      domainPath: {
        primary: { key: 'uncertainty', level: 3 },
        cross: []
      },
      promptInfo: {
        persona: '你是Burton Malkiel，普林斯顿大学经济学教授，《漫步华尔街》作者。你是有效市场理论的主要倡导者，认为股票价格遵循随机漫步，打败市场的尝试大多是徒劳的。你建议普通投资者购买低成本的指数基金。',
        tone: '学术理性，以数据和统计证据说话，不迷信任何投资大师'
      }
    },

    'richdad': {
      basic: {
        slug: 'richdad',
        title: '富爸爸穷爸爸',
        author: { name: 'Robert Kiyosaki', nameCN: '罗伯特·清崎', role: '财商教育倡导者' },
        chapters: 13,
        school: 'business',
        schoolName: '商业'
      },
      conceptMappings: [],
      domainPath: {
        primary: { key: 'uncertainty', level: 1 },
        cross: []
      },
      promptInfo: {
        persona: '你是Robert Kiyosaki，《富爸爸穷爸爸》作者。你通过两个父亲对比的方式，颠覆性地重新定义了资产与负债——资产是把钱装进口袋的东西，负债是把钱掏出口袋的东西。你主张财务教育优先于学历教育。',
        tone: '故事驱动，对比鲜明，用亲身体验激发读者重新思考金钱观'
      }
    },

    'principles': {
      basic: {
        slug: 'principles',
        title: '原则',
        author: { name: 'Ray Dalio', nameCN: '雷·达里奥', role: '桥水基金创始人' },
        chapters: 38,
        school: 'mind',
        schoolName: '心理'
      },
      conceptMappings: [],
      domainPath: {
        primary: { key: 'mind', level: 2 },
        cross: []
      },
      promptInfo: {
        persona: '你是Ray Dalio，桥水基金创始人，《原则》作者。你将人生和投资的经验提炼为一套可执行的原则系统，主张「极度透明」和「极度求真」的组织文化。你相信痛苦+反思=进步，错误是最好的学习机会。',
        tone: '系统化思维，条理分明，像个工程师一样拆解人生和投资的规律'
      }
    },

    'stock-operator': {
      basic: {
        slug: 'stock-operator',
        title: '股票大作手回忆录',
        author: { name: 'Jesse Livermore', nameCN: '杰西·利弗莫尔', role: '传奇交易员' },
        chapters: 25,
        school: 'mind',
        schoolName: '心理'
      },
      conceptMappings: [
        {
          id: 'cycle',
          chapters: [1, 5, 8, 12, 14, 21, 23],
          usage: '利弗莫尔是市场周期的最早洞察者之一——他通过「市场永远不会错」的信念，用真金白银感知牛熊转换。他的传奇交易记录本身就是一部活的市场周期编年史，比任何教科书都更生动。',
          stance: 'extender'
        },
        {
          id: 'contrarian',
          chapters: [5, 6, 8, 10, 12, 23, 24],
          usage: '利弗莫尔提供了逆向操作最生动的实战案例——1907年恐慌中做多、1929年大崩盘前做空。但他也以自身四次破产警示世人：在趋势真正逆转前过早逆向本身就是致命风险。',
          stance: 'proponent'
        }
      ],
      domainPath: {
        primary: { key: 'mind', level: 1 },
        cross: [
          { key: 'cycle', chapter: 23, label: '第23章「市场永远不会错」' }
        ]
      },
      promptInfo: {
        persona: '你是Jesse Livermore，20世纪初最传奇的交易员，《股票大作手回忆录》的主角。你从报价板抄写员起步，凭借对价格波动的超凡直觉成为华尔街最受瞩目的投机者。你的人生充满大起大落，每一次破产都带来新的洞见。',
        tone: '老练深沉，洞见深刻，充满实战智慧，带有一丝悲剧英雄的色彩'
      }
    },

    'economic-moat': {
      basic: {
        slug: 'economic-moat',
        title: '巴菲特的护城河',
        author: { name: 'Pat Dorsey', nameCN: '帕特·多尔西', role: '晨星公司前股票研究主管' },
        chapters: 15,
        school: 'value',
        schoolName: '价值'
      },
      conceptMappings: [
        {
          id: 'moat',
          chapters: [1, 2, 3, 4, 5, 11, 12],
          usage: '多尔西将巴菲特的护城河概念进行了学术化系统整理，区分了四种护城河类型：无形资产、转换成本、网络效应和成本优势。他提供了可操作的护城河识别清单和定量分析框架，使抽象概念落地为投资决策工具。',
          stance: 'extender'
        },
        {
          id: 'growth-stock',
          chapters: [7, 8, 9, 13, 14],
          usage: '多尔西强调成长性与护城河的联动关系——没有护城河保护的成长是不可持续的。他系统论证了为什么高增长行业的投资回报往往不如有护城河的中速增长企业，挑战了「增长即好」的普遍误解。',
          stance: 'extender'
        }
      ],
      domainPath: {
        primary: { key: 'business', level: 2 },
        cross: []
      },
      promptInfo: {
        persona: '你是Pat Dorsey，晨星公司前股票研究主管，《巴菲特的护城河》作者。你专注于将巴菲特模糊的「护城河」概念转化为可操作的分析框架，帮助投资者系统性地识别和评估企业的竞争优势。',
        tone: '结构清晰，注重方法论，每一条判断都有具体的检查标准'
      }
    }
  };

  // =============================================================================
  // 第二层：CONCEPTS — 纯粹的概念定义（无 books[] 字段）
  // =============================================================================

  var CONCEPTS = [
    {
      id: 'intrinsic-value',
      name: '内在价值',
      emoji: '💎',
      domain: 'valuation',
      color: '#2c6faa',
      brief: '企业真正值多少钱——独立于市场报价的价值之锚',
      master: '本杰明·格雷厄姆',
      relatedConcepts: ['margin-of-safety', 'mr-market'],
      learningOrder: 1
    },
    {
      id: 'margin-of-safety',
      name: '安全边际',
      emoji: '🛡️',
      domain: 'valuation',
      color: '#2c6faa',
      brief: '买价与价值之间的缓冲垫——为错误、厄运与未知留出余地',
      master: '本杰明·格雷厄姆',
      relatedConcepts: ['intrinsic-value', 'risk'],
      learningOrder: 2
    },
    {
      id: 'mr-market',
      name: '市场先生',
      emoji: '🤪',
      domain: 'valuation',
      color: '#2c6faa',
      brief: '把市场当作情绪化的报价员——利用他的报价，而非追随他的情绪',
      master: '本杰明·格雷厄姆',
      relatedConcepts: ['risk', 'contrarian'],
      learningOrder: 3
    },
    {
      id: 'moat',
      name: '护城河',
      emoji: '🏰',
      domain: 'business',
      color: '#2d7d46',
      brief: '保护企业长期超额利润的结构性竞争优势',
      master: '沃伦·巴菲特',
      relatedConcepts: ['circle-of-competence', 'growth-stock'],
      learningOrder: 4
    },
    {
      id: 'circle-of-competence',
      name: '能力圈',
      emoji: '🎯',
      domain: 'business',
      color: '#2d7d46',
      brief: '只在自己真正理解的领域下注——圈的大小不重要，知道边界才重要',
      master: '沃伦·巴菲特',
      relatedConcepts: ['moat', 'concentration'],
      learningOrder: 5
    },
    {
      id: 'growth-stock',
      name: '成长股',
      emoji: '🌱',
      domain: 'business',
      color: '#2d7d46',
      brief: '寻找能持续成长十年的企业——但警惕为成长支付过高价格',
      master: '菲利普·费雪',
      relatedConcepts: ['moat', 'intrinsic-value'],
      learningOrder: 6
    },
    {
      id: 'risk',
      name: '风险',
      emoji: '⚠️',
      domain: 'cycle',
      color: '#c75b39',
      brief: '不是波动性，而是永久性损失的概率——以及模型之外的未知',
      master: '霍华德·马克斯',
      relatedConcepts: ['margin-of-safety', 'black-swan', 'cycle'],
      learningOrder: 7
    },
    {
      id: 'cycle',
      name: '周期',
      emoji: '🔄',
      domain: 'cycle',
      color: '#c75b39',
      brief: '万物皆有周期——你无法预测未来，但可以知道自己身处何处',
      master: '霍华德·马克斯',
      relatedConcepts: ['risk', 'contrarian'],
      learningOrder: 8
    },
    {
      id: 'black-swan',
      name: '黑天鹅与肥尾',
      emoji: '🦢',
      domain: 'uncertainty',
      color: '#b8860b',
      brief: '历史由极端事件塑造——既然无法预测，就构建能从中获益的结构',
      master: '纳西姆·塔勒布',
      relatedConcepts: ['risk', 'concentration'],
      learningOrder: 9
    },
    {
      id: 'misjudgment',
      name: '人类误判心理学',
      emoji: '🧠',
      domain: 'mind',
      color: '#7b4fbf',
      brief: '投资者最大的敌人不是市场，是自己的心理偏误',
      master: '查理·芒格',
      relatedConcepts: ['contrarian', 'concentration'],
      learningOrder: 10
    },
    {
      id: 'contrarian',
      name: '逆向投资',
      emoji: '🔄',
      domain: 'mind',
      color: '#7b4fbf',
      brief: '在众人恐惧处买入，在众人贪婪处警惕——但逆向必须以正确为前提',
      master: '霍华德·马克斯',
      relatedConcepts: ['risk', 'mr-market'],
      learningOrder: 11
    },
    {
      id: 'concentration',
      name: '集中与分散',
      emoji: '⚖️',
      domain: 'mind',
      color: '#7b4fbf',
      brief: '下重注还是广撒网？集中派、分散派与杠铃派的世纪分歧',
      master: '菲利普·费雪',
      relatedConcepts: ['risk', 'circle-of-competence'],
      learningOrder: 12
    }
  ];

  // =============================================================================
  // 第三层：KNOWLEDGE_POINTS — 初始批次（多书多章关联的知识点训练数据）
  // =============================================================================

  var KNOWLEDGE_POINTS = [
    {
      id: 'dcf-training',
      name: 'DCF估值法',
      emoji: '📊',
      domain: 'valuation',
      description: '掌握自由现金流折现模型的核心逻辑——从预测未来现金流到计算终值，理解「模糊的正确优于精确的错误」。',
      formula: '企业价值 = Σ(FCF_t / (1+r)^t) + 终值/(1+r)^n',
      chapters: {
        'buffett-letters': {
          ch: [1, 5],
          ref: '第1章「内在价值」、第5章「收购与估值」',
          usageNote: '巴菲特用股东信实际演示DCF的商业判断应用——他注重的是定性理解（roe、护城河持久性）而非精确数字，强调估值的关键在于商业判断而非公式计算',
          cases: ['参见1976年GEICO案例——以极低价格买入系统性重要的企业']
        },
        'intelligent-investor': {
          ch: [11],
          ref: '第11章「普通股投资的一般方法」',
          usageNote: '格雷厄姆提供了内在价值的简化计算公式（V = EPS × (8.5 + 2g)），强调即使简化的估值也比完全不估值好——为DCF的前身方法论',
          cases: []
        }
      },
      questions: [
        { q: '如果一家公司未来5年自由现金流分别为100、120、140、160、180，折现率10%，永续增长率3%，请计算其内在价值。', hint: '先逐年折现前5年，再计算终值并折现，加总即可。终值 = FCF5×(1+g)/(r-g)' },
        { q: '巴菲特说「模糊的正确优于精确的错误」，你如何理解这句话在DCF估值中的含义？', hint: '想象你对未来现金流的预测有±20%的误差——最终估值差异会比20%大得多还是小得多？' }
      ],
      level: 3,
      formulaDisplay: '企业价值 = <b>Σ(FCF_t / (1+r)^t)</b> + <b>终值/(1+r)^n</b>',
      conceptKeyPoints: [
        'DCF的威力不在于精确数字，而在于强迫你思考企业的长期盈利能力和竞争地位——模糊的正确胜过精确的错误',
        '自由现金流 ≠ 净利润：需从净利润加回折旧摊销、减去维持性资本支出，这是区分"会计利润"和"可分配现金"的关键一步',
        '终值通常占DCF结果的60-80%，因此永续增长率的微小变化会导致估值大幅波动——这是DCF最大的敏感性来源',
        '折现率是你的机会成本：10%意味着每年至少要求10%回报——已经相当于长期股市平均收益，不要用太低的折现率自我欺骗'
      ],
      concepts: ['intrinsic-value', 'margin-of-safety'],
      trainingStrategy: 'dcf-model',
      training: {
        guided: {
          intro: '你是巴菲特的投资助理，现在需要评估贵州茅台的内在价值。我们将分步骤完成DCF估值计算。',
          steps: [
            { label: '步骤1：计算自由现金流', formula: 'FCF = 净利润 + 折旧摊销 - 维持性资本支出 = 747 + 28 - 45 = 730亿' },
            { label: '步骤2：预测未来5年FCF', formula: '假设12%增长率：Y1=818, Y2=916, Y3=1026, Y4=1149, Y5=1287亿' },
            { label: '步骤3：计算终值', formula: '终值 = FCF5 × (1+g) / (r-g) = 1287 × 1.03 / 0.07 ≈ 18942亿' },
            { label: '步骤4：折现加总', formula: '企业价值 = Σ(FCF_t/(1.1)^t) + 终值/(1.1)^5 ≈ 15100亿' }
          ],
          targetAnswer: 15100
        },
        practice: {
          scenario: '你正在评估贵州茅台，请根据以下数据计算其DCF内在价值。',
          data: { netProfit: 747, depreciation: 28, maintenanceCapex: 45 },
          questions: [
            { q: '第一步：计算茅台的自由现金流（FCF）', answer: 730, hint: 'FCF = 净利润 + 折旧摊销 - 维持性资本支出' },
            { q: '假设5年增长率12%、永续增长率3%、折现率10%，企业价值约多少亿？', answer: 15100, hint: '先按12%增长计算5年FCF，再用戈登增长模型算终值并折现' }
          ]
        },
        realWorld: {
          company: 'maotai',
          analysis: '茅台2023年自由现金流730亿——如果你相信它未来5年还能保持12%增长（考虑提价和直销占比提升），当前市值若低于15000亿则存在安全边际。但需注意：白酒行业面临人口结构和消费习惯的长期变化，12%增速能否持续需要更保守的验证。',
          decisionQuestion: '以当前市值买入茅台，DCF估值给出的安全边际足够吗？'
        }
      }
    },
    {
      id: 'margin-of-safety-calc',
      name: '安全边际计算',
      emoji: '🛡️',
      domain: 'valuation',
      description: '学会计算买价与内在价值之间的安全缓冲——理解不同投资风格对安全边际的不同要求（30%？50%？），以及在极端市场中的实际应用。',
      formula: '安全边际 = (内在价值 - 买入价格) / 内在价值 × 100%',
      chapters: {
        'intelligent-investor': {
          ch: [14, 15, 20],
          ref: '第14章「防御型投资者的选股策略」、第20章「安全边际」',
          usageNote: '格雷厄姆给出量化标准：普通股买入价应低于净流动资产价值的2/3——这是安全边际最严格的定义，为纯定量标准',
          cases: ['格雷厄姆在1930年代大萧条中通过大量买入低于净流动资产价值的股票证明了安全边际策略的有效性']
        },
        'buffett-letters': {
          ch: [1, 3],
          ref: '第1章「内在价值」、第3章「投资替代品」',
          usageNote: '巴菲特将安全边际从格雷厄姆的净资产折扣升级为对优质企业成长性的折价——买好公司也要留足安全边际，并用「承重30吨的桥」的比喻将抽象概念可视化',
          cases: []
        },
        'antifragile': {
          ch: [11, 12, 17],
          ref: '第11章「远离中庸」、第12章「杠铃策略」',
          usageNote: '塔勒布从非线性角度重新解读安全边际——杠铃策略的本质是创造「损失有上限、收益无上限」的凸性回报结构，将传统安全边际从单一资产扩展到组合层面',
          cases: []
        }
      },
      questions: [
        { q: '格雷厄姆要求安全边际不低于33%，而巴菲特在优质企业中接受20%的安全边际。他们的标准差异说明了什么？', hint: '想想两人关注的企业类型有何不同——是净资产为主的企业还是具有成长性的企业？' },
        { q: '塔勒布认为杠铃策略是安全边际的终极形态。请解释杠铃策略如何创造「下跌保护+上涨参与」的非对称收益。', hint: '90%极度保守+10%极度激进 = 最差情况损失10%，最好情况收益可能远超10%' }
      ],
      level: 2,
      formulaDisplay: '<b>安全边际</b> = (<b>内在价值</b> - <b>买入价格</b>) / <b>内在价值</b> × 100%',
      conceptKeyPoints: [
        '安全边际不是固定数字——格雷厄姆要求33%以上（纯定量、净资产折扣），巴菲特对优质企业接受20%，关键在于你对内在价值估算置信度有多高',
        '塔勒布将安全边际从单资产升级到组合层面：杠铃策略的本质是"损失有上限、收益无上限"的凸性结构——这是安全边际的非线性版本',
        '计算安全边际的最大陷阱：高估内在价值。如果你对企业的前景过于乐观，再宽的"安全边际"也只是自我安慰——保守估计是安全边际的前提',
        '实操中的安全边际思维：不要只算一个内在价值，要算三个（乐观/基准/悲观），然后确保即使在悲观场景下买入价仍低于内在价值'
      ],
      concepts: ['margin-of-safety', 'intrinsic-value'],
      trainingStrategy: 'safety-margin',
      training: {
        guided: {
          intro: '你是格雷厄姆的学生，在1950年代用净资产法选股。你需要计算一家制造业公司的安全边际。',
          steps: [
            { label: '步骤1：计算净流动资产价值', formula: '净流动资产 = 流动资产 - 总负债 = 500 - 200 = 300万' },
            { label: '步骤2：应用格雷厄姆标准', formula: '买入价应 ≤ 净流动资产价值 × 2/3 = 300 × 0.667 = 200万' },
            { label: '步骤3：计算安全边际', formula: '如果内在价值=净流动资产=300万，买入价=200万，安全边际=(300-200)/300=33.3%——恰好满足格雷厄姆标准' },
            { label: '步骤4：判断是否买入', formula: '安全边际33%达标，但还需检查管理层诚信和业务可持续性——格雷厄姆也要求定性辅助' }
          ],
          targetAnswer: 33
        },
        practice: {
          scenario: '某公司净流动资产价值300亿，当前市值200亿。请按格雷厄姆标准计算安全边际并判断。',
          data: { netProfit: 0, depreciation: 0, maintenanceCapex: 0 },
          questions: [
            { q: '按格雷厄姆标准，该公司的安全边际是多少？（精确到整数）', answer: 33, hint: '安全边际 = (300-200)/300 = 33.3%，取整为33%' },
            { q: '这个安全边际达到格雷厄姆的33%门槛了吗？还需要什么额外验证？', answer: null, hint: '刚好达标33%，但格雷厄姆还要求：管理层诚信、业务稳定盈利、分散持有20只以上' }
          ]
        },
        realWorld: {
          company: 'gree',
          analysis: '格力电器2023年净流动资产价值约950亿（流动资产扣总负债），当前市值约2000亿——用格雷厄姆标准看，安全边际为负。但用巴菲特标准（现金流折现），格力每年220亿自由现金流，成长放缓后用DCF估值可能仍有安全边际。两种标准的结论差异正是投资风格的差异。',
          decisionQuestion: '格力电器是格雷厄姆式的"烟蒂"还是巴菲特式的"优质企业"？它的安全边际在哪一层？'
        }
      }
    },
    {
      id: 'moat-analysis',
      name: '护城河分析',
      emoji: '🏰',
      domain: 'business',
      description: '掌握四种护城河类型的识别与评估方法——无形资产、转换成本、网络效应、成本优势。学会区分真正的护城河与短暂的竞争优势。',
      formula: '护城河宽度 = f(市场份额稳定性, 定价权, ROIC持续性, 进入壁垒)',
      chapters: {
        'economic-moat': {
          ch: [3, 4, 5, 6, 7],
          ref: '第3-7章「四类护城河的详细分析」',
          usageNote: '多尔西提供了四种护城河类型的结构化清单——每一项都有可验证的判断标准。他强调ROIC持续高于资本成本是护城河存在的定量证据，建议从五年历史数据中验证',
          cases: ['晨星公司对数千家上市公司的护城河评级——分为宽护城河、窄护城河和无护城河三级']
        },
        'fisher': {
          ch: [2, 3, 4, 5],
          ref: '第2-5章「闲聊法与15条原则」',
          usageNote: '费雪在护城河概念被正式命名前就已经在实践它的核心——他通过「闲聊法」调研管理层质素、研发持续性和销售组织效率，来定性判断企业是否拥有持久竞争力',
          cases: ['费雪在1955年买入摩托罗拉并持有超过40年的案例——在大多数投资者尚未理解科技护城河时提前布局']
        }
      },
      questions: [
        { q: '一家公司在行业内市场份额第一但利润率逐年下降——它还有护城河吗？请用多尔西的四类框架分析。', hint: '市场份额本身不是护城河，要区分是成本优势驱动的份额领先还是价格战驱动的份额领先' },
        { q: '费雪说「找到能持续成长十年的企业后几乎永远不卖」——这个判断需要确认哪些护城河特征？', hint: '想想研发持续性、管理层愿景、行业变革速度三个维度' }
      ],
      level: 2,
      formulaDisplay: '护城河宽度 = f(<b>市场份额稳定性</b>, <b>定价权</b>, <b>ROIC持续性</b>, <b>进入壁垒</b>)',
      conceptKeyPoints: [
        '多尔西的四类护城河（无形资产、转换成本、网络效应、成本优势）是识别工具，但关键是验证ROIC是否持续高于资本成本——这是护城河存在的定量证据',
        '市场份额≠护城河：靠价格战抢来的份额随时可能丢失，真正的护城河体现在"涨价也不丢客户"的定价权上',
        '费雪式的护城河调研：如果你不知道企业为什么能持续赚钱，你就没有能力圈——通过"闲聊法"访谈供应商、客户、前员工来验证护城河的真实性',
        '护城河不是永久的——技术变革（柯达）、消费习惯变迁（传统零售）、监管变化（教培）都可能一夜之间摧毁看似坚固的护城河'
      ],
      concepts: ['moat', 'circle-of-competence'],
      trainingStrategy: 'moat-judgment',
      training: {
        guided: {
          intro: '你是多尔西的晨星分析师，需要评估一家消费品龙头公司是否拥有"宽护城河"评级。',
          steps: [
            { label: '步骤1：检查无形资产', formula: '品牌是否让消费者愿意支付溢价？茅台出厂价969元，市场价2800元——巨大的品牌溢价证明无形资产护城河极宽' },
            { label: '步骤2：检查转换成本', formula: '客户换成竞品的成本有多高？白酒消费者有口味惯性+社交认同需求，转换成本高' },
            { label: '步骤3：检查ROIC持续性', formula: '过去10年ROIC平均28%，远高于资本成本10%——超额利润持续性是护城河最有力的定量证据' },
            { label: '步骤4：评估护城河宽度', formula: '无形资产(强)+转换成本(中)+ROIC持续性(强)=宽护城河。唯一风险：年轻人白酒消费下降的长期趋势' }
          ],
          targetAnswer: null
        },
        practice: {
          scenario: '海天味业在调味品行业市占率第一，但近两年利润率下滑。请用多尔西框架分析它的护城河是否在变窄。',
          data: {},
          questions: [
            { q: '海天味业的护城河主要属于哪一类型？为什么近期在变窄？', answer: null, hint: '从成本优势（规模效应）+无形资产（品牌）角度分析。变窄原因：社区团购冲击渠道壁垒、零添加酱油竞争对手增多', keywords: ['成本优势', '无形资产', '渠道壁垒', '竞争加剧'] }
          ]
        },
        realWorld: {
          company: 'haitian',
          analysis: '海天味业的护城河正在经历压力测试：社区团购打破了传统经销商的渠道壁垒（转换成本降低），零添加酱油的消费趋势削弱了"海天=酱油"的品牌独占性。但海天260万吨的年产能带来的成本优势短期内难以复制——关键看它能否在零添加赛道夺回定价权。',
          decisionQuestion: '海天味业的护城河是永久性的，还是正在被侵蚀？'
        }
      }
    },
    {
      id: 'cycle-positioning',
      name: '周期定位',
      emoji: '🔄',
      domain: 'cycle',
      description: '学会识别市场周期信号——信贷松紧、投资者情绪、估值水平——判断当前所处的周期位置，而非预测未来的走势。',
      formula: '周期位置 = f(信贷周期, 情绪周期, 估值周期) → { 极度乐观 → 乐观 → 中性 → 悲观 → 极度悲观 }',
      chapters: {
        'market-cycle': {
          ch: [1, 2, 3, 8, 9, 14, 15],
          ref: '第1-3章「周期的基本规律」、第8章「钟摆意识」、第14-15章「如何应对周期」',
          usageNote: '马克斯的钟摆模型是周期定位的核心框架——投资者情绪在「贪婪与恐惧」之间永恒摆动。他提供了可观察的信号清单：信贷利差、IPO热度、投资者情绪调查、估值分位数等',
          cases: ['2008年金融危机——雷曼破产后马克斯大量买入不良债务，因为信贷周期已处于极度恐慌状态']
        },
        'alchemy-finance': {
          ch: [1, 2, 5, 6],
          ref: '第1-2章「反身性理论」、第5-6章「繁荣/萧条模型」',
          usageNote: '索罗斯的反身性理论为周期提供了更深层的解释机制——价格不仅反映基本面，也会改变基本面。他通过繁荣/萧条序列的八阶段模型，解释了周期为何会自我放大并最终逆转',
          cases: ['1992年索罗斯做空英镑——识别英镑汇率周期从过度高估向崩溃的转折点']
        }
      },
      questions: [
        { q: '马克斯说「我们无法预测未来，但可以知道自己身处何处」。你如何判断当前市场在周期中的大致位置？列出3-5个观察指标。', hint: '想想信贷环境、投资者行为、估值水平和媒体情绪四个维度' },
        { q: '索罗斯的反身性理论如何解释「牛市的最后一波往往最疯狂」这个经验现象？', hint: '价格上涨→基本面预期改善→更多资金入场→价格进一步上涨→这是一个自我强化的正反馈循环' }
      ],
      level: 3,
      formulaDisplay: '周期位置 = f(<b>信贷周期</b>, <b>情绪周期</b>, <b>估值周期</b>) → { 极度乐观 → 乐观 → 中性 → 悲观 → 极度悲观 }',
      conceptKeyPoints: [
        '马克斯的钟摆模型核心洞见：你不需要预测钟摆何时反转，只需要知道它在哪个极端位置——极端位置本身就是最可靠的反转信号',
        '周期定位的三个核心观察指标：信贷利差（高=恐慌）、IPO/并购热度（高=贪婪）、估值分位数（>90%=危险区），三者同向共振时信号最强烈',
        '索罗斯的反身性为周期提供了"加速器"机制——价格上涨会改变基本面预期，基本面预期改变又会吸引更多资金，形成自我实现的繁荣/萧条循环',
        '周期定位最常见的错误：在中间位置频繁操作。马克斯强调"大部分时间我们应该什么都不做，只在极端位置行动"——耐心等待极端比精准预测更重要'
      ],
      concepts: ['cycle', 'risk', 'contrarian'],
      trainingStrategy: 'cycle-judgment',
      training: {
        guided: {
          intro: '你是霍华德·马克斯的橡树资本分析师，现在是2024年末，你需要评估当前市场在周期中的位置并给出配置建议。',
          steps: [
            { label: '步骤1：观察信贷周期', formula: '当前信用利差处于历史低位（3.5%），银行放贷标准宽松——说明信贷市场极度乐观' },
            { label: '步骤2：观察情绪周期', formula: '散户开户数创历史新高，社交媒体上"全职炒股"话题火爆——情绪处于贪婪区间' },
            { label: '步骤3：观察估值周期', formula: 'A股整体PE处于75%分位，创业板PE处于90%分位——估值偏贵但不极端' },
            { label: '步骤4：综合定位', formula: '三个指标2个指向贪婪+1个偏贵→整体偏向乐观端，建议降低仓位至60%，备好现金等待回调' }
          ],
          targetAnswer: null
        },
        practice: {
          scenario: '你观测到以下信号：信贷利差收窄至3.2%、券商开户数环比增长30%、A股PE处于80%分位。请判断当前周期位置。',
          data: {},
          questions: [
            { q: '当前市场最可能处于钟摆的哪个位置？请结合三个指标分析', answer: null, hint: '利差低+开户暴增+PE高位=钟摆偏向贪婪端。但PE还没到95%极端分位，所以不是最疯狂阶段', keywords: ['贪婪端', '乐观区间', '准备防御', '降低仓位'] }
          ]
        },
        realWorld: {
          company: 'maotai',
          analysis: '茅台自身的周期属性较弱（白酒消费偏刚性），但其估值周期非常明显：2014年塑化剂+反腐双重打击下PE跌至10倍（极度悲观），2021年PE突破60倍（极度乐观）。周期定位告诉你：在茅台PE低于15倍时买入、高于50倍时警惕——这比任何盈利预测都更可靠。',
          decisionQuestion: '当前茅台的估值分位数在历史什么位置？这个位置历史上出现过几次？'
        }
      }
    },
    {
      id: 'lollapalooza',
      name: '误判心理叠加',
      emoji: '🧠',
      domain: 'mind',
      description: '理解芒格的Lollapalooza效应——多种心理偏误同时作用时，其放大效应远超单个偏误的简单加总。学会识别投资决策中的心理陷阱叠加。',
      formula: '错误决策 = Σ(认知偏误_i) + ε×Π(认知偏误_i)  ← 交叉增强项指数放大',
      chapters: {
        'poor-charlie': {
          ch: [10, 11],
          ref: '第10-11章「人类误判心理学」',
          usageNote: '芒格系统归纳了25种心理偏误，并独创性地指出多种偏误同时作用时的lollapalooza叠加效应——例如泡沫顶部的决策同时被从众心理、过度自信、确认偏误和承诺升级影响，共振后产生灾难性结果',
          cases: ['芒格列举了联邦快递员工夜班效率低下的案例——激励偏误+社会认同偏误叠加后轻松解决']
        },
        'stock-operator': {
          ch: [1, 5, 14, 21],
          ref: '第1章「起步」、第14章「市场陷阱」、第21章「交易心理」',
          usageNote: '利弗莫尔用自己的四次破产经历提供了误判心理的实战教材——他的失败案例展示了当贪婪、希望和不服输同时作用时，即使最有经验的交易员也会犯下毁灭性错误',
          cases: ['1907年利弗莫尔在正确做空后过早平仓——恐惧和贪婪同时作用导致利润大幅缩水']
        }
      },
      questions: [
        { q: '请描述一个你经历过（或观察到的）至少3种心理偏误同时影响投资决策的场景。每种偏误分别起到了什么作用？', hint: '常见组合：确认偏误（只找支持买入的证据）+ 过度自信（我比市场聪明）+ 从众心理（别人都在买）= 泡沫高位买入' },
        { q: '芒格说「在手里只有锤子的人看来，所有问题都是钉子」——这句话揭示的是哪种心理偏误？如何避免？', hint: '这是「工具依赖偏误」——需要刻意建立多元思维模型来对冲' }
      ],
      level: 4,
      formulaDisplay: '错误决策 = <b>Σ(认知偏误_i)</b> + <b>ε×Π(认知偏误_i)</b> ← 交叉增强项指数放大',
      conceptKeyPoints: [
        'Lollapalooza效应的本质是"1+1>10"——单个偏误可能只让判断偏差10%，但3-5个偏误叠加时会产生指数级放大，因为偏误之间相互强化和印证',
        '最常见的致命叠加组合：确认偏误（只找支持证据）+ 过度自信（我比市场聪明）+ 从众心理（别人都在买）+ 承诺升级（已经买了就不愿认错）= 泡沫高位满仓',
        '芒格的25种偏误清单不是为了"背下来"，而是为了建立心理检查清单——每次重大决策前逐条对照，这是对抗叠加效应最有效的方法',
        '避免Lollapalooza的实操技巧：重大投资决策强制冷却期（至少48小时）、找最聪明反对者专门挑刺、写下"我为什么可能错"的反向论证'
      ],
      concepts: ['misjudgment', 'concentration'],
      trainingStrategy: 'lollapalooza-judgment',
      training: {
        guided: {
          intro: '你是芒格的投资助理，现在要分析一个经典的投资失败案例——2000年科技泡沫中，一位经验丰富的基金经理为什么会在顶部满仓？',
          steps: [
            { label: '步骤1：识别确认偏误', formula: '他只看科技股上涨的新闻和分析师唱多报告，自动忽略估值过高的警告信号' },
            { label: '步骤2：识别过度自信', formula: '"我研究科技行业20年了，这次不一样"——用经验否定了均值回归的基本规律' },
            { label: '步骤3：识别从众心理', formula: '"所有人都在买，我不买就落后了"——社会认同压力压倒了独立判断' },
            { label: '步骤4：识别Lollapalooza叠加', formula: '三种偏误叠加：确认+自信+从众=「这次真的不一样」幻觉→满仓→泡沫破裂→亏损70%' }
          ],
          targetAnswer: null
        },
        practice: {
          scenario: '2021年初，某基金经理在白酒板块PE已经60倍时决定满仓买入。请分析他可能受到了哪些心理偏误的影响。',
          data: {},
          questions: [
            { q: '请分析该决策中可能存在的3种以上心理偏误，以及它们是如何叠加的', answer: null, hint: '至少识别：确认偏误（只看白酒提价新闻）、过度自信（"白酒永远涨"）、从众（"机构都在买"）、承诺升级（"已经买了就不能承认错"）', keywords: ['确认偏误', '过度自信', '从众心理', '承诺升级', 'Lollapalooza叠加'] }
          ]
        },
        realWorld: {
          company: 'maotai',
          analysis: '2021年茅台PE突破60倍时，几乎所有"利好"都被放大——提价预期、直销占比提升、消费升级叙事。这时最容易触发Lollapalooza效应：确认偏误让你只看到这些利好，过度自信让你相信"茅台永远涨"，从众心理让你觉得"所有大佬都在买"。识别这些信号本身就是最强的风险控制。',
          decisionQuestion: '当茅台PE超过60倍时，你决策过程中可能存在哪些心理偏误的叠加？'
        }
      }
    },
    {
      id: 'barbell-strategy',
      name: '杠铃策略',
      emoji: '🏋️',
      domain: 'uncertainty',
      description: '掌握塔勒布的杠铃策略——90%极度保守 + 10%极度激进——构建在极端事件中损失有限、收益无限的组合结构。',
      formula: '最优配置 = α×极安全资产 + (1-α)×极高赔率资产，其中α≈0.9，且拒绝所有「中等风险」的中庸选项',
      chapters: {
        'antifragile': {
          ch: [11, 12, 13, 17, 18],
          ref: '第11章「远离中庸」、第12章「杠铃策略」、第17-18章「反脆弱性与可选性」',
          usageNote: '塔勒布系统阐述了杠铃策略的理论基础——双峰策略（bimodal strategy）在不确定环境下的优越性。他论证了「中庸」策略（如60/40股债配置）在肥尾世界中的脆弱性，并提出更稳健的极端配置方案',
          cases: ['塔勒布在自己的基金Empirica中实践杠铃策略——大部分资金配置超安全国债，小部分资金做多极端事件的期权，在2008年获得巨额回报']
        }
      },
      questions: [
        { q: '传统的60%股票40%债券组合与杠铃策略有什么本质区别？为什么塔勒布认为传统组合「脆弱」？', hint: '60/40组合在2008年跌了约25%——它既没有极端保守的保护，也没有极端激进的收益弹性' },
        { q: '请设计一个你的个人杠铃策略：90%的资金配置在哪里？10%的资金配置在哪里？为什么这样能「反脆弱」？', hint: '思考什么是你的「极安全」和「极高赔率」——每个人的答案都不同' }
      ],
      level: 3,
      formulaDisplay: '最优配置 = <b>α×极安全资产</b> + <b>(1-α)×极高赔率资产</b>，其中α≈0.9，拒绝所有「中等风险」',
      conceptKeyPoints: [
        '杠铃策略的反脆弱性来源于「凸性」——损失有上限（最多亏10%），收益无上限（激进端可能翻10倍），而传统60/40组合在两极事件中两端暴露',
        '塔勒布的核心洞见：在肥尾世界，「平均」没有意义——极端事件决定最终收益，中庸策略（等权重分散）反而是最脆弱的',
        '90%+10%不是固定比例——关键是「极度安全」和「极度激进」的两端，中间地带全部拒绝。极度安全≠国债，也可以是现金、黄金或你的职业技能',
        '杠铃策略不只是资产配置，更是人生策略：白天稳定工作（安全端）+ 晚上高风险创业（激进端），比全职创业的单点暴露更反脆弱'
      ],
      concepts: ['black-swan', 'margin-of-safety'],
      trainingStrategy: 'barbell-judgment',
      training: {
        guided: {
          intro: '你是塔勒布基金的风险管理师，需要为一个1000万的家族办公室设计杠铃策略配置方案。',
          steps: [
            { label: '步骤1：确定安全端', formula: '900万配置超短期国债+黄金ETF——在任何市场环境下本金安全，年化约2-3%' },
            { label: '步骤2：确定激进端', formula: '100万配置深度虚值看跌期权+小型生物科技股——最大损失100万，潜在收益10倍以上' },
            { label: '步骤3：拒绝中间地带', formula: '不配置任何BBB级信用债、不配置大盘指数基金——它们在黑天鹅中也会暴跌' },
            { label: '步骤4：压力测试', formula: '股市暴跌50%→激进端归零(-100万)，安全端赚18万→净亏82万(-8.2%)，远好于60/40组合亏30%' }
          ],
          targetAnswer: 900
        },
        practice: {
          scenario: '你管理1000万资金，按塔勒布的杠铃策略配置——90%极度安全，10%极度激进。',
          data: { netProfit: 0, depreciation: 0, maintenanceCapex: 0 },
          questions: [
            { q: '安全端你配置多少资金？', answer: 900, hint: '1000万 × 90% = 900万' },
            { q: '如果激进端全部亏损，最大总损失是多少？（安全端年化2%）', answer: 82, hint: '900万×2%=赚18万，激进端亏100万，净亏82万=总资产-8.2%' }
          ]
        },
        realWorld: {
          company: 'maotai',
          analysis: '茅台的杠铃策略应用：将茅台本身视为「安全端」——拥有无可争议的品牌护城河和现金流稳定性。但不要全仓茅台，而是大部分配茅台+小部分配极端逆向机会（如白酒行业危机中抄底二三线酒企的反弹期权）。',
          decisionQuestion: '如果把茅台作为杠铃策略的安全端，激进端你应该配置什么？'
        }
      }
    },
    {
      id: 'porter-five-forces',
      name: '波特五力分析',
      emoji: '⚔️',
      domain: 'business',
      description: '掌握波特的行业竞争结构分析框架——从供应商议价能力、买家议价能力、新进入者威胁、替代品威胁、现有竞争者强度五个维度评估行业吸引力和利润潜力。',
      formula: '行业吸引力 = f(供应商力量↓, 买家力量↓, 进入壁垒↑, 替代品威胁↓, 竞争强度↓)',
      chapters: {
        'economic-moat': {
          ch: [1, 2, 3],
          ref: '第1-3章「护城河与竞争优势」',
          usageNote: '多尔西的护城河四分类本质上是对波特五力框架的实战简化——四类护城河分别对应"进入壁垒"和"竞争强度"两个关键力量。他补充了定量验证（ROIC持续性），弥补了五力分析偏定性的局限',
          cases: ['晨星公司用波特五力+ROIC分析构建了覆盖数千家上市公司的护城河评级体系']
        },
        'fisher': {
          ch: [2, 3, 4, 5],
          ref: '第2-5章「闲聊法与15条原则」',
          usageNote: '费雪的15条原则中至少5条直接对应波特五力的具体维度——"研发投入"对应进入壁垒、"销售组织效率"对应竞争强度。他用实地调研补足了五力模型缺乏动态视角的不足',
          cases: ['费雪通过访谈摩托罗拉的供应商和客户，验证其技术壁垒和客户粘性——本质是波特五力的实地调研版']
        }
      },
      questions: [
        { q: '用波特五力框架分析你所在行业（或你熟悉的行业）的竞争格局。哪一力是最关键的？', hint: '先逐一评估五种力量，然后找到"最紧绷"的那一根弦——它决定了整个行业的利润率天花板' },
        { q: '多尔西的四类护城河分别对应波特五力的哪一力？为什么这个映射能帮我们更快识别护城河？', hint: '无形资产和成本优势→对应"进入壁垒"；网络效应和转换成本→对应"买家议价能力"的削弱' }
      ],
      level: 2,
      formulaDisplay: '行业吸引力 = f(<b>供应商力量↓</b>, <b>买家力量↓</b>, <b>进入壁垒↑</b>, <b>替代品威胁↓</b>, <b>竞争强度↓</b>)',
      conceptKeyPoints: [
        '波特五力的核心洞见：行业利润率不是由企业自身决定的，而是由五种外部力量的博弈均衡决定的——即使最优秀的管理层在糟糕的行业结构中也难有作为',
        '五力分析的关键不是"列出五种力量"，而是找到"主导力量"——通常是1-2个力量决定了行业80%的利润率天花板，如航空业的"竞争强度"和制药业的"进入壁垒"',
        '多尔西的四类护城河可视为五力模型的"逆向工程"——宽护城河意味着五力对企业有利，窄护城河意味着至少有一力在侵蚀企业超额利润',
        '五力模型最大局限：假设行业结构是静态的。技术变革（如互联网对零售的"替代品威胁"）可在十年内彻底重写五力格局——费雪的动态调研视角是最好的补充'
      ],
      concepts: ['moat', 'circle-of-competence'],
      trainingStrategy: 'moat-judgment',
      training: {
        guided: {
          intro: '你是晨星公司的行业分析师，需要评估中国调味品行业的竞争结构，判断是否值得长期投资。',
          steps: [
            { label: '步骤1：评估进入壁垒', formula: '调味品需要大规模产能（海天260万吨/年）+ 百万级终端渠道深耕 → 进入壁垒极高' },
            { label: '步骤2：评估供应商/买家', formula: '原材料大豆小麦供应分散→供应商弱。餐饮零售渠道高度分散→买家弱。两头弱=企业掌握定价权' },
            { label: '步骤3：评估替代品威胁', formula: '调味品是必需品+口味惯性极强 → 替代品威胁低。但零添加和植物基替代趋势需持续跟踪' },
            { label: '步骤4：评估竞争强度', formula: '海天/李锦记/厨邦三强格局 → 竞争有序。综合：行业吸引力中等偏上，适合长期投资' }
          ],
          targetAnswer: null
        },
        practice: {
          scenario: '请用波特五力框架分析白酒行业的竞争结构，解释为什么这个行业能长期维持高利润率。',
          data: {},
          questions: [
            { q: '白酒行业的"主导力量"是哪一力？为什么这一力支撑了整个行业的高利润率？', answer: null, hint: '进入壁垒（品牌+工艺传承+老酒储备+渠道控制）是最强力量。其他四力都较弱——供应商分散、买家分散、替代品文化壁垒高、竞争格局稳定', keywords: ['进入壁垒', '品牌壁垒', '工艺壁垒', '老酒储备', '弱竞争'] }
          ]
        },
        realWorld: {
          company: 'maotai',
          analysis: '用波特五力看茅台：供应商→高粱农户极度分散（力弱），买家→经销商与终端消费者极度分散（力弱），新进入者→品牌+工艺+老酒储备三重壁垒几乎不可逾越（力弱），替代品→白酒消费文化根深蒂固（力弱），竞争→茅台在超高端市场几无对手（力弱）。五力全部弱势的行业结构极为罕见——这就是茅台能长期维持90%毛利率的结构性原因。',
          decisionQuestion: '茅台的波特五力结构中，哪一力如果发生变化，最可能动摇其护城河？'
        }
      }
    },
    {
      id: 'kelly-formula',
      name: '凯利公式',
      emoji: '🎲',
      domain: 'uncertainty',
      description: '掌握凯利公式的核心逻辑——在已知胜率和赔率时计算最优下注比例，平衡"不错过机会"与"不爆仓"之间的永恒矛盾。',
      formula: '最优仓位 f* = (bp - q) / b，其中 b=赔率，p=胜率，q=1-p',
      chapters: {
        'poor-charlie': {
          ch: [4, 5, 11],
          ref: '第4-5章「芒格投资检查清单」、第11章「人类误判心理学」',
          usageNote: '芒格虽未直接使用凯利公式，但他的"好机会极少，来了就要下重注"的集中投资理念与凯利公式的核心逻辑一致。关键是人在情绪高涨时倾向于系统性高估胜率p——这正是误判心理学的领地',
          cases: ['芒格在2008年金融危机中大幅加仓富国银行——事后看恰好符合凯利公式的最优仓位逻辑']
        },
        'buffett-way': {
          ch: [5],
          ref: '第5章「集中投资」',
          usageNote: '哈格斯特朗用凯利公式严密论证了巴菲特的集中投资策略——如果你的胜率判断准确，凯利公式给出的最优仓位往往远高于传统分散投资的建议比例',
          cases: ['巴菲特在1960年代将40%的合伙基金集中投资American Express——凯利公式的经典实战演绎']
        }
      },
      questions: [
        { q: '假设一个投资机会胜率60%、赔率2:1（赢则赚2元，输则亏1元），按凯利公式应投入多少仓位？', hint: 'f* = (2×0.6 - 0.4)/2 = (1.2-0.4)/2 = 0.4 → 40%仓位' },
        { q: '芒格说"好机会来了要下重注"，但也强调"避免爆仓"。凯利公式如何平衡这两个看似矛盾的原则？', hint: '凯利公式给出的已是风险调整后的最优仓位——不会太轻浪费机会，也不会太重导致爆仓。关键是胜率p必须准确' }
      ],
      level: 4,
      formulaDisplay: '最优仓位 f* = (<b>b</b>×<b>p</b> - <b>q</b>) / <b>b</b>，其中 b=赔率，p=胜率，q=1-p',
      conceptKeyPoints: [
        '凯利公式的核心不是"多下注"，而是"算清楚再下注"——绝大多数投资者既不知道胜率也不知道赔率，本质是在赌博而非投资',
        '凯利公式最大的实战障碍：胜率p无法精确知道。巴菲特和芒格的优势在于通过深度研究将"不知道p"转化为"p大概率在70%以上"',
        '"半凯利"策略（f*/2）是实战中常见的保守修正——当你对胜率估计不自信时，用一半的凯利仓位换取更多的安全缓冲',
        '凯利公式的致命陷阱：如果你高估了胜率（以为60%实际只有40%），凯利公式会让你下重注亏大钱——"无知"比"知错"更危险'
      ],
      concepts: ['risk', 'concentration'],
      trainingStrategy: 'safety-margin',
      training: {
        guided: {
          intro: '你是一个量化基金经理，需要在已知概率的投资机会中计算最优仓位，避免过度下注或浪费机会。',
          steps: [
            { label: '步骤1：确认参数', formula: '经深度研究，你判断胜率p=60%，赔率b=2（赢则赚2倍亏损额，输则亏本金）' },
            { label: '步骤2：代入凯利公式', formula: 'f* = (2×0.6 - 0.4) / 2 = (1.2-0.4)/2 = 0.4' },
            { label: '步骤3：换算仓位', formula: '最优仓位 = 40%——应投入40%的可投资金到这个机会' },
            { label: '步骤4：保守修正', formula: '如果你对60%胜率把握不大，用半凯利：40%÷2=20%仓位，留足安全边际' }
          ],
          targetAnswer: 40
        },
        practice: {
          scenario: '你发现一个投资机会：60%概率翻倍（赚100%），40%概率亏光。请用凯利公式计算最优仓位。',
          data: { netProfit: 0, depreciation: 0, maintenanceCapex: 0 },
          questions: [
            { q: '按凯利公式，最优仓位是多少？', answer: 20, hint: '翻倍即赔率b=1（净赚100%）。f* = (1×0.6 - 0.4)/1 = 0.2 = 20%' },
            { q: '如果沿用半凯利策略，你应该投入多少仓位？', answer: 10, hint: '半凯利 = 20% ÷ 2 = 10%' }
          ]
        },
        realWorld: {
          company: 'maotai',
          analysis: '假设你判断茅台未来5年有70%概率涨50%（赔率b=0.5），30%概率跌20%。凯利公式：f*=(0.5×0.7-0.3)/0.5=10%。但如果通过深度研究将胜率从70%提升到85%：f*=(0.5×0.85-0.15)/0.5=55%——深度研究的价值被凯利公式放大了5倍以上。',
          decisionQuestion: '如果你投资茅台的胜率判断从70%提升到85%，最优仓位应该增加几倍？'
        }
      }
    },
    {
      id: 'independent-thinking',
      name: '独立判断训练',
      emoji: '🦉',
      domain: 'mind',
      description: '训练在信息噪音和市场情绪中保持独立判断的能力——从识别群体思维陷阱到建立个人投资哲学，培养逆向而不固执的思维品质。',
      formula: '独立判断质量 = f(信息来源多样性, 反对意见认真程度, 决策冷却时间) - 从众压力',
      chapters: {
        'poor-charlie': {
          ch: [1, 2, 4, 11],
          ref: '第1-2章「芒格传略」、第4章「投资原则检查清单」、第11章「人类误判心理学」',
          usageNote: '芒格毕生都在展示独立判断的价值——从拒绝投资互联网泡沫（1999年大幅跑输但避免了破产）到2008年大举买入。他强调"反过来想，总是反过来想"是独立思考的起点',
          cases: ['芒格在1999年科技泡沫中坚持不碰互联网股——被投资人嘲笑为"老古董"，但2000年泡沫破裂后成为最大赢家之一']
        },
        'principles': {
          ch: [2, 3, 4],
          ref: '第2-4章「极度求真与极度透明」',
          usageNote: '达利欧将独立判断系统化为"可信度加权"决策法——不是谁的嗓门大听谁的，而是根据每个人在该领域的过往准确率来加权投票，这是一个可复制的独立判断替代方案',
          cases: ['桥水基金的可信度加权会议——每个参会者的意见权重由其在该议题上的历史判断准确率决定']
        }
      },
      questions: [
        { q: '回想一次你"随大流"做出的投资决策（或观察到的），那次决策结果如何？如果当时你独立判断，会做出什么不同选择？', hint: '先还原当时的市场情绪环境，再复盘如果"反过来想"会看到什么不一样的信号' },
        { q: '达利欧的可信度加权决策法如何帮助我们在团队中保持独立判断？它和"少数服从多数"有什么本质区别？', hint: '可信度加权≠民主投票——两个专家的一致意见权重可能超过100个外行的反对票' }
      ],
      level: 3,
      formulaDisplay: '独立判断质量 = f(<b>信息来源多样性</b>, <b>反对意见认真程度</b>, <b>决策冷却时间</b>) - <b>从众压力</b>',
      conceptKeyPoints: [
        '独立判断≠逆势而为——独立判断是在充分消化信息后的自信结论，可能与共识一致也可能相左。纯粹为了与众不同而逆向，和盲目从众一样危险',
        '芒格的"反过来想"是最强的独立判断训练：无论多么看好一个投资，先花同等时间论证"为什么我可能错了"——这个过程逼你看到从众者看不到的风险',
        '培养独立判断的最有效方法：建立信息防火墙——刻意减少对财经媒体和社交平台的依赖，增加对一手资料（财报、招股书、行业数据）的直接摄入',
        '达利欧的可信度加权决策本质上是一种"算法化的独立判断"——个人容易情绪化，但按规则给不同来源的意见加权，可得到超越个人偏见的更优结论'
      ],
      concepts: ['contrarian', 'concentration'],
      trainingStrategy: 'lollapalooza-judgment',
      training: {
        guided: {
          intro: '你是桥水基金的新分析师，达利欧要求你在团队讨论中练习可信度加权决策——每个人的意见都会被记录并按其历史准确率加权。',
          steps: [
            { label: '步骤1：列出所有观点', formula: '5位分析师对某公司估值：A(看多,PE=30), B(看空,PE=15), C(看多,PE=28), D(看空,PE=18), E(中立,PE=22)' },
            { label: '步骤2：分配可信度权重', formula: 'A在汽车行业判断准确率85%→权重0.85, B准确率70%→0.70, C/D/E按各自准确率加权' },
            { label: '步骤3：计算加权平均', formula: '(30×0.85+15×0.70+28×0.65+18×0.75+22×0.60)/(0.85+0.70+0.65+0.75+0.60)≈22.5' },
            { label: '步骤4：形成判断', formula: '加权PE=22.5——既不是看多的30也不是看空的15，而是综合了每个人判断质量后的最优估计点' }
          ],
          targetAnswer: null
        },
        practice: {
          scenario: '2022年10月，恒生指数跌至15000点，所有媒体都在喊"港股已死"。请练习用独立判断"反过来想"。',
          data: {},
          questions: [
            { q: '请列出3-5个"港股可能已经见底"的独立判断依据——必须是你自己分析得出的，不是从媒体或他人那里听来的。', answer: null, hint: '从估值分位数（历史最低5%）、股息率（超4%）、回购金额（创历史新高）、恐惧指数（极度恐慌）等客观指标出发', keywords: ['估值分位数', '股息率', '回购创纪录', '恐惧指数', '逆向买入信号'] }
          ]
        },
        realWorld: {
          company: 'maotai',
          analysis: '2024年茅台从2500跌至1400，市场上涌现大量"白酒消费见顶"、"年轻人不喝白酒"的看空报告。独立判断要求你：不看报告数量（从众压力），而是亲自验证——白酒产量确实下降但高端消费在增长，茅台直销占比从6%提升到45%，这些都是独立判断的原材料而非二手结论。',
          decisionQuestion: '当所有人都说茅台"太贵了"或"太便宜了"时，你用什么客观数据来做独立判断？'
        }
      }
    },
    {
      id: 'credit-cycle',
      name: '信贷周期指标',
      emoji: '💳',
      domain: 'cycle',
      description: '掌握信贷周期的关键观察指标——从信用利差、信贷增速到银行放贷标准。理解马克斯为什么说"信贷周期是周期之母"，以及它如何驱动其他所有周期。',
      formula: '信贷周期位置 = f(信用利差, M2增速, 社融增速, 银行放贷标准) → { 宽松 → 中性 → 紧缩 → 危机 }',
      chapters: {
        'market-cycle': {
          ch: [1, 2, 3, 8, 9],
          ref: '第1-3章「周期的基本规律」、第8章「钟摆意识」',
          usageNote: '马克斯将信贷周期定位为"周期之母"——信贷的扩张和收缩决定了企业融资成本和投资意愿，进而依次驱动经济周期、盈利周期和估值周期。他提供了可量化的观察信号清单',
          cases: ['2008年金融危机——信贷市场冻结（利差从2%飙升至6%），马克斯识别此极端信号后大举买入不良债务，获得巨额回报']
        },
        'alchemy-finance': {
          ch: [1, 2, 5, 6],
          ref: '第1-2章「反身性理论」、第5-6章「繁荣/萧条模型」',
          usageNote: '索罗斯的反身性为信贷周期提供了加速机制——银行放贷意愿增强→企业加杠杆→盈利改善→抵押品升值→银行进一步放贷，这个正反馈持续加速直到逆转崩溃',
          cases: ['2008年次贷危机是信贷周期反身性的教科书——房价上涨→银行放松放贷→更多人买房→房价进一步上涨→最终崩溃']
        }
      },
      questions: [
        { q: '马克斯说"信贷窗口从大开到大关的速度，比任何人想象的都快"。为什么信贷周期比其他周期更剧烈？', hint: '信贷涉及杠杆——企业用借来的钱投资，银行用存款放贷。一旦信心逆转，去杠杆是一个自我加速的死亡螺旋' },
        { q: '如何用社融增速、M2增速和信用利差三个指标判断信贷周期的位置？三者同向时意味着什么？', hint: '社融和M2双双上升=信贷扩张期，利差收窄=风险偏好高。三个指标同向共振=周期趋势的确定性最高' }
      ],
      level: 3,
      formulaDisplay: '信贷周期位置 = f(<b>信用利差</b>, <b>M2增速</b>, <b>社融增速</b>, <b>银行放贷标准</b>) → { 宽松→中性→紧缩→危机 }',
      conceptKeyPoints: [
        '马克斯的核心洞见：信贷周期是"周期之母"——因为大多数经济活动依赖信贷，信贷的扩张和收缩会依次传导到经济周期、盈利周期、估值周期，最终影响所有资产价格',
        '信贷周期剧烈性的根源在于杠杆的双向性：加杠杆时资产价格↑→抵押品升值→可借更多钱（正反馈）；去杠杆时资产价格↓→抵押品贬值→被迫卖资产还钱（死亡螺旋）',
        '观察信贷周期最实用的三个先行指标：信用利差（实时反映市场风险定价）、银行放贷标准调查（央行每季度公布，反映信贷供给端）、社融增速（反映实体经济加杠杆意愿）',
        '索罗斯的反身性完美解释了信贷周期的极端摆动——银行本身的行为就是信贷周期的一部分，它们"在应该放贷时收紧，在应该收紧时放贷"'
      ],
      concepts: ['cycle', 'risk'],
      trainingStrategy: 'cycle-judgment',
      training: {
        guided: {
          intro: '你是橡树资本的宏观分析师，负责监控信贷周期信号，为马克斯的大类资产配置提供前瞻性建议。',
          steps: [
            { label: '步骤1：看信用利差', formula: 'AA级企业债与国债利差从1.5%升至3.2%→信贷市场开始定价风险，但尚未到恐慌水平（历史恐慌阈值>5%）' },
            { label: '步骤2：看银行放贷标准', formula: '央行调查显示：净20%的银行收紧了大中企业放贷标准→信贷供给端开始收缩' },
            { label: '步骤3：看社融增速', formula: '社融同比增速从12%降至8%→实体经济加杠杆意愿下降，信贷需求端也在同步收缩' },
            { label: '步骤4：综合定位与配置', formula: '利差↑+银行收紧+社融↓=信贷周期从宽松转向紧缩初期。建议降权益仓位至50%，增持短久期债券，准备"干火药"等待危机抄底' }
          ],
          targetAnswer: null
        },
        practice: {
          scenario: '你观测到以下信号：信用利差从2%扩大到4%（未到6%危机线），社融增速从10%降到7%，M2增速从11%降到8%。请判断信贷周期位置。',
          data: {},
          questions: [
            { q: '当前信贷周期处于什么阶段？你的资产配置建议是什么？', answer: null, hint: '利差扩大+社融M2双降=从宽松向紧缩过渡的初期。建议减仓权益提高现金比例，增持短债，关注利差能否突破5%的危机阈值', keywords: ['紧缩初期', '减仓权益', '增持现金短债', '准备抄底', '关注利差阈值'] }
          ]
        },
        realWorld: {
          company: 'maotai',
          analysis: '茅台作为消费龙头，在信贷紧缩周期中反而是防御性的——白酒消费以现金为主，几乎不依赖信贷。但信贷紧缩会通过两条路径间接影响茅台：①经济减速→商务宴请减少→高端白酒需求下降；②市场估值下行→茅台PE被动压缩。历史数据显示茅台在去杠杆周期（2018、2022年）最大回撤约40%——信贷周期对茅台的影响主要在估值端而非基本面。',
          decisionQuestion: '如果信贷周期进入紧缩阶段，茅台应该在利差刚开始扩大时买，还是等利差达到恐慌顶峰时买？'
        }
      }
    }
  ];

  // =============================================================================
  // 静态辅助数据
  // =============================================================================

  /** 内置公司案例数据（简化财报，供训练场使用） */
  var COMPANY_CASES = {
    maotai: {
      name: '贵州茅台', industry: '白酒', year: 2023,
      data: {
        revenue: 1505, netProfit: 747, depreciation: 28, maintenanceCapex: 45,
        totalAssets: 2540, equity: 1720, liabilities: 820,
        freeCashFlow: 730, growthRate5y: 0.12, discountRate: 0.10
      }
    },
    wuliangye: {
      name: '五粮液', industry: '白酒', year: 2023,
      data: {
        revenue: 832, netProfit: 302, depreciation: 18, maintenanceCapex: 35,
        totalAssets: 960, equity: 630, liabilities: 330,
        freeCashFlow: 285, growthRate5y: 0.10, discountRate: 0.10
      }
    },
    yili: {
      name: '伊利股份', industry: '乳制品', year: 2023,
      data: {
        revenue: 1262, netProfit: 104, depreciation: 22, maintenanceCapex: 48,
        totalAssets: 820, equity: 420, liabilities: 400,
        freeCashFlow: 78, growthRate5y: 0.06, discountRate: 0.10
      }
    },
    gree: {
      name: '格力电器', industry: '家电', year: 2023,
      data: {
        revenue: 1890, netProfit: 245, depreciation: 35, maintenanceCapex: 60,
        totalAssets: 3100, equity: 950, liabilities: 2150,
        freeCashFlow: 220, growthRate5y: 0.04, discountRate: 0.10
      }
    },
    haitian: {
      name: '海天味业', industry: '调味品', year: 2023,
      data: {
        revenue: 245, netProfit: 56, depreciation: 8, maintenanceCapex: 12,
        totalAssets: 380, equity: 280, liabilities: 100,
        freeCashFlow: 52, growthRate5y: 0.08, discountRate: 0.10
      }
    },
    cmb: {
      name: '招商银行', industry: '银行', year: 2023,
      data: {
        revenue: 3391, netProfit: 1466, depreciation: 82, maintenanceCapex: 55,
        totalAssets: 110285, equity: 9862, liabilities: 100423,
        freeCashFlow: 1280, growthRate5y: 0.10, discountRate: 0.10
      }
    },
    catl: {
      name: '宁德时代', industry: '新能源', year: 2023,
      data: {
        revenue: 4009, netProfit: 441, depreciation: 235, maintenanceCapex: 365,
        totalAssets: 6713, equity: 2044, liabilities: 4669,
        freeCashFlow: 310, growthRate5y: 0.42, discountRate: 0.10
      }
    },
    tencent: {
      name: '腾讯控股', industry: '互联网', year: 2023,
      data: {
        revenue: 6090, netProfit: 1152, depreciation: 415, maintenanceCapex: 340,
        totalAssets: 16365, equity: 8170, liabilities: 8195,
        freeCashFlow: 1570, growthRate5y: 0.11, discountRate: 0.10
      }
    },
    changjiang: {
      name: '长江电力', industry: '电力', year: 2023,
      data: {
        revenue: 781, netProfit: 275, depreciation: 168, maintenanceCapex: 62,
        totalAssets: 5689, equity: 1855, liabilities: 3834,
        freeCashFlow: 385, growthRate5y: 0.06, discountRate: 0.10
      }
    },
    byd: {
      name: '比亚迪', industry: '新能源汽车', year: 2023,
      data: {
        revenue: 6023, netProfit: 300, depreciation: 465, maintenanceCapex: 585,
        totalAssets: 6780, equity: 1378, liabilities: 5402,
        freeCashFlow: 155, growthRate5y: 0.32, discountRate: 0.10
      }
    },
    hengrui: {
      name: '恒瑞医药', industry: '医药', year: 2023,
      data: {
        revenue: 228, netProfit: 43, depreciation: 16, maintenanceCapex: 22,
        totalAssets: 437, equity: 390, liabilities: 47,
        freeCashFlow: 36, growthRate5y: 0.05, discountRate: 0.10
      }
    },
    pingan: {
      name: '中国平安', industry: '保险', year: 2023,
      data: {
        revenue: 9137, netProfit: 856, depreciation: 58, maintenanceCapex: 48,
        totalAssets: 115834, equity: 12243, liabilities: 103591,
        freeCashFlow: 2150, growthRate5y: 0.04, discountRate: 0.10
      }
    }
  };

  /** 概念对比金句（用于首页金句墙） */
  var CONCEPT_QUOTES = [
    {
      concept: '安全边际',
      left:  { text: '安全边际是投资的中心概念——为错误、厄运、未知留出缓冲。', who: '格雷厄姆', book: '聪明的投资者', slug: 'intelligent-investor' },
      right: { text: '安全边际本质是负凸性的对冲——为"未知的未知"留出空间。', who: '塔勒布', book: '反脆弱', slug: 'antifragile' }
    },
    {
      concept: '风险的定义',
      left:  { text: '风险不是波动性——它是永久性损失的概率。', who: '霍华德·马克斯', book: '周期', slug: 'market-cycle' },
      right: { text: '真正的风险在你的模型之外——从未发生过的事才最危险。', who: '塔勒布', book: '黑天鹅', slug: 'black-swan' }
    },
    {
      concept: '市场先生',
      left:  { text: '市场先生是你的仆人，不是你的向导——利用他，别追随他。', who: '格雷厄姆', book: '聪明的投资者', slug: 'intelligent-investor' },
      right: { text: '华尔街没有新鲜事——因为投机像群山一样古老。', who: '利弗莫尔', book: '股票大作手回忆录', slug: 'stock-operator' }
    },
    {
      concept: '集中与分散',
      left:  { text: '好机会一生只有几次，来了就要下重注。', who: '查理·芒格', book: '穷查理宝典', slug: 'poor-charlie' },
      right: { text: '90%极度保守 + 10%极度激进——比100%中庸更稳健。', who: '塔勒布', book: '反脆弱', slug: 'antifragile' }
    },
    {
      concept: '护城河',
      left:  { text: '我们要的是被宽阔护城河保护的经济城堡。', who: '巴菲特', book: '致股东的信', slug: 'buffett-letters' },
      right: { text: '用15条原则找到能持续成长十年的企业，然后几乎永远不卖。', who: '菲利普·费雪', book: '怎样选择成长股', slug: 'fisher' }
    },
    {
      concept: '逆向思维',
      left:  { text: '在别人沮丧卖出时买入——需要最大的勇气，但提供最大的利润。', who: '霍华德·马克斯', book: '周期', slug: 'market-cycle' },
      right: { text: '别人贪婪时恐惧，别人恐惧时贪婪。', who: '巴菲特', book: '致股东的信', slug: 'buffett-letters' }
    }
  ];

  /** 等级体系 */
  var LEVELS = [
    { level: 1, name: '见习学徒', xpNeeded: 0,   emoji: '🌱' },
    { level: 2, name: '初级行者', xpNeeded: 10,  emoji: '🥾' },
    { level: 3, name: '中级行者', xpNeeded: 30,  emoji: '🧗' },
    { level: 4, name: '高阶行者', xpNeeded: 60,  emoji: '🏔️' },
    { level: 5, name: '见习智者', xpNeeded: 100, emoji: '🔮' },
    { level: 6, name: '贤者',     xpNeeded: 160, emoji: '🧙' },
    { level: 7, name: '大贤者',   xpNeeded: 240, emoji: '👑' },
    { level: 8, name: '宗师',     xpNeeded: 340, emoji: '💎' },
    { level: 9, name: '传奇宗师', xpNeeded: 460, emoji: '⭐' }
  ];

  /** 难度色标 */
  var LV_COLOR = { 1: '#4caf50', 2: '#2196F3', 3: '#FF9800', 4: '#e74c3c' };
  var LV_EMOJI = { 1: '🌱', 2: '🌿', 3: '🍂', 4: '🌋' };

  // =============================================================================
  // localStorage 键名
  // =============================================================================
  var KEY_PROGRESS = 'reading_progress';
  var KEY_PRINCIPLES = 'my_principles';
  var KEY_STREAK = 'reading_streak';
  var KEY_ABILITY = 'ability_profile';
  var KEY_READ_TIMES = 'chapter_read_times';

  // =============================================================================
  // 工具函数
  // =============================================================================
  function safeJSON(str, fallback) {
    try { return JSON.parse(str) || fallback; } catch (e) { return fallback; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  // =============================================================================
  // QueryEngine — 纯JS查询引擎（无后端依赖）
  // =============================================================================

  var QueryEngine = {

    /**
     * 根据概念ID查找概念定义
     */
    findConceptById: function(id) {
      for (var i = 0; i < CONCEPTS.length; i++) {
        if (CONCEPTS[i].id === id) return CONCEPTS[i];
      }
      return null;
    },

    /**
     * 根据知识点ID查找知识点定义
     */
    findKpById: function(id) {
      for (var i = 0; i < KNOWLEDGE_POINTS.length; i++) {
        if (KNOWLEDGE_POINTS[i].id === id) return KNOWLEDGE_POINTS[i];
      }
      return null;
    },

    /**
     * 获取包含指定概念的书籍列表
     * 返回书籍基本信息 + 该概念在该书中的映射详情
     */
    getConceptBooks: function(conceptId) {
      var results = [];
      var slugs = Object.keys(BOOK_REGISTRY);
      for (var i = 0; i < slugs.length; i++) {
        var book = BOOK_REGISTRY[slugs[i]];
        if (!book.conceptMappings) continue;
        for (var j = 0; j < book.conceptMappings.length; j++) {
          if (book.conceptMappings[j].id === conceptId) {
            results.push({
              slug: slugs[i],
              title: book.basic.title,
              author: book.basic.author.nameCN,
              school: book.basic.school,
              schoolName: book.basic.schoolName,
              chapters: book.basic.chapters,
              mapping: book.conceptMappings[j]
            });
            break;
          }
        }
      }
      return results;
    },

    /**
     * 获取某本书涉及的所有概念详情
     */
    getBookConcepts: function(slug) {
      var book = BOOK_REGISTRY[slug];
      if (!book || !book.conceptMappings) return [];
      var results = [];
      for (var i = 0; i < book.conceptMappings.length; i++) {
        var cm = book.conceptMappings[i];
        var concept = QueryEngine.findConceptById(cm.id);
        results.push({
          id: cm.id,
          name: concept ? concept.name : cm.id,
          emoji: concept ? concept.emoji : '',
          domain: concept ? concept.domain : '',
          color: concept ? concept.color : '',
          chapters: cm.chapters,
          usage: cm.usage,
          stance: cm.stance
        });
      }
      return results;
    },

    /**
     * 获取某本书中特定域/所有域的知识点关联
     */
    getBookKnowledgePoints: function(slug, domainKey) {
      if (!BOOK_REGISTRY[slug]) return [];  // 书已删除，自动返回空
      var results = [];
      for (var i = 0; i < KNOWLEDGE_POINTS.length; i++) {
        var kp = KNOWLEDGE_POINTS[i];
        if (domainKey && kp.domain !== domainKey) continue;
        if (kp.chapters && kp.chapters[slug]) {
          results.push({
            id: kp.id,
            name: kp.name,
            emoji: kp.emoji,
            domain: kp.domain,
            description: kp.description,
            chapterInfo: kp.chapters[slug]
          });
        }
      }
      return results;
    },

    /**
     * 根据概念ID查找所有关联的知识点（通过 concepts 字段）
     * 用于概念卡片底部的训练入口
     */
    getConceptKnowledgePoints: function(conceptId) {
      var results = [];
      for (var i = 0; i < KNOWLEDGE_POINTS.length; i++) {
        var kp = KNOWLEDGE_POINTS[i];
        if (kp.concepts && kp.concepts.length) {
          for (var j = 0; j < kp.concepts.length; j++) {
            if (kp.concepts[j] === conceptId) {
              results.push({
                id: kp.id,
                name: kp.name,
                emoji: kp.emoji || '',
                domain: kp.domain
              });
              break;
            }
          }
        }
      }
      return results;
    },

    /**
     * 获取包含指定知识点的书籍列表
     */
    getKpBooks: function(kpId) {
      var kp = QueryEngine.findKpById(kpId);
      if (!kp || !kp.chapters) return [];
      var results = [];
      var slugs = Object.keys(kp.chapters);
      for (var i = 0; i < slugs.length; i++) {
        var slug = slugs[i];
        var book = BOOK_REGISTRY[slug];
        if (!book) continue;
        results.push({
          slug: slug,
          title: book.basic.title,
          author: book.basic.author.nameCN,
          school: book.basic.school,
          schoolName: book.basic.schoolName,
          chapters: book.basic.chapters,
          chapterInfo: kp.chapters[slug]
        });
      }
      return results;
    },

    /**
     * 从 BOOK_REGISTRY 动态构建五域修行体系
     */
    buildDomains: function() {
      // 域定义
      var domainDefs = {
        'business':     { key: 'business', emoji: '🧭', name: '商业认知', question: '能不能识别好生意？', description: '理解企业的商业模式、竞争优势和护城河——这是投资的地基。林奇教我们从身边发现好公司，费雪教我们深度调研，多尔西教我们识别护城河。', master: '彼得·林奇', masterInitial: '林', color: '#2d7d46' },
        'valuation':    { key: 'valuation', emoji: '⚖️', name: '资产估值', question: '这家公司值多少钱？', description: '格雷厄姆开创的「安全边际」原则是价值投资的基石。学会用数字说话——内在价值、DCF、PE/PB，把模糊的直觉转化为可量化的判断。', master: '本杰明·格雷厄姆', masterInitial: '格', color: '#2c6faa' },
        'cycle':        { key: 'cycle', emoji: '🔄', name: '周期与市场', question: '市场现在处于什么位置？', description: '霍华德·马克斯的钟摆理论告诉我们：市场在恐惧与贪婪之间永恒摇摆。学会读懂周期信号——信贷、情绪、估值——你就能在极端时刻做出逆向决策。', master: '霍华德·马克斯', masterInitial: '马', color: '#c75b39' },
        'mind':         { key: 'mind', emoji: '🧘', name: '心性与哲学', question: '我怎么不被情绪干掉？', description: '芒格的多元思维模型提醒我们：投资最大的敌人是镜子里的那个人。认知偏差、从众心理、损失厌恶——这些心理陷阱每年让投资者付出惨痛代价。这一域帮你建立投资纪律。', master: '查理·芒格', masterInitial: '芒', color: '#7b4fbf' },
        'uncertainty':  { key: 'uncertainty', emoji: '🌪️', name: '不确定性与风险', question: '我不知道的事如何伤害我？', description: '塔勒布的「黑天鹅」系列重塑了我们对风险的理解。真正危险的不是已知风险，而是你不知道你不知道的东西。学会构建反脆弱组合，从波动中获益而非受害。', master: '纳西姆·塔勒布', masterInitial: '塔', color: '#b8860b' }
      };

      // 初始化每个域的 books 和 cross 数组
      var domainKeys = Object.keys(domainDefs);
      for (var d = 0; d < domainKeys.length; d++) {
        domainDefs[domainKeys[d]].books = [];
        domainDefs[domainKeys[d]].cross = [];
      }

      // 遍历所有书籍，分配到各域
      var bookSlugs = Object.keys(BOOK_REGISTRY);
      for (var i = 0; i < bookSlugs.length; i++) {
        var slug = bookSlugs[i];
        var book = BOOK_REGISTRY[slug];
        if (!book.domainPath || !book.domainPath.primary) continue;

        var primary = book.domainPath.primary;
        if (domainDefs[primary.key]) {
          domainDefs[primary.key].books.push({ slug: slug, lv: primary.level });
        }

        // 处理 cross 引用
        if (book.domainPath.cross) {
          for (var j = 0; j < book.domainPath.cross.length; j++) {
            var cr = book.domainPath.cross[j];
            if (domainDefs[cr.key]) {
              domainDefs[cr.key].cross.push({ slug: slug, ch: cr.chapter, label: cr.label });
            }
          }
        }
      }

      // 按 level 排序每个域的 books
      for (var d2 = 0; d2 < domainKeys.length; d2++) {
        var dk = domainKeys[domainKeys.length - (d2 + 1)]; // process in reverse for stability
        // Actually, let's just sort
      }
      for (var d3 = 0; d3 < domainKeys.length; d3++) {
        var dm = domainDefs[domainKeys[d3]];
        dm.books.sort(function(a, b) {
          if (a.lv !== b.lv) return a.lv - b.lv;
          return a.slug.localeCompare(b.slug);
        });
      }

      // 返回排序后的域数组
      var result = [];
      for (var d4 = 0; d4 < domainKeys.length; d4++) {
        result.push(domainDefs[domainKeys[d4]]);
      }
      return result;
    },

    /**
     * 获取某本书的 AI 人设信息
     */
    getBookPromptInfo: function(slug) {
      var book = BOOK_REGISTRY[slug];
      return book ? book.promptInfo : null;
    },

    /**
     * 验证数据完整性
     */
    validate: function() {
      var errors = [];
      var warnings = [];

      // 检查所有引用有效性
      var bookSlugs = Object.keys(BOOK_REGISTRY);
      for (var i = 0; i < bookSlugs.length; i++) {
        var slug = bookSlugs[i];
        var book = BOOK_REGISTRY[slug];

        // 检查 conceptMappings 中的概念ID是否在 CONCEPTS 中定义
        if (book.conceptMappings) {
          for (var j = 0; j < book.conceptMappings.length; j++) {
            if (!QueryEngine.findConceptById(book.conceptMappings[j].id)) {
              errors.push('BOOK_REGISTRY.' + slug + '.conceptMappings[' + j + ']: concept "' + book.conceptMappings[j].id + '" not found in CONCEPTS');
            }
          }
        }

        // 检查 domainPath 中的域Key是否有效
        if (book.domainPath && book.domainPath.primary) {
          var validDomains = ['business', 'valuation', 'cycle', 'mind', 'uncertainty'];
          if (validDomains.indexOf(book.domainPath.primary.key) === -1) {
            errors.push('BOOK_REGISTRY.' + slug + '.domainPath.primary.key: invalid domain "' + book.domainPath.primary.key + '"');
          }
        }

        // 检查 chapters 范围
        if (!book.basic.chapters || book.basic.chapters < 1) {
          warnings.push('BOOK_REGISTRY.' + slug + ': chapters may be invalid (' + book.basic.chapters + ')');
        }
      }

      // 检查 KNOWLEDGE_POINTS 中的章节引用
      for (var k = 0; k < KNOWLEDGE_POINTS.length; k++) {
        var kp = KNOWLEDGE_POINTS[k];
        if (kp.chapters) {
          var kpSlugs = Object.keys(kp.chapters);
          for (var m = 0; m < kpSlugs.length; m++) {
            if (!BOOK_REGISTRY[kpSlugs[m]]) {
              errors.push('KNOWLEDGE_POINTS.' + kp.id + '.chapters: book "' + kpSlugs[m] + '" not found in BOOK_REGISTRY');
            }
          }
        }
      }

      // 检查 KNOWLEDGE_POINTS 中的 concepts 引用
      for (var n = 0; n < KNOWLEDGE_POINTS.length; n++) {
        var kp2 = KNOWLEDGE_POINTS[n];
        if (kp2.concepts && kp2.concepts.length) {
          for (var p = 0; p < kp2.concepts.length; p++) {
            if (!QueryEngine.findConceptById(kp2.concepts[p])) {
              errors.push('KNOWLEDGE_POINTS.' + kp2.id + '.concepts: concept "' + kp2.concepts[p] + '" not found in CONCEPTS');
            }
          }
        }
        // 检查 training.realWorld.company 引用
        if (kp2.training && kp2.training.realWorld && kp2.training.realWorld.company) {
          if (!COMPANY_CASES[kp2.training.realWorld.company]) {
            errors.push('KNOWLEDGE_POINTS.' + kp2.id + '.training.realWorld.company: "' + kp2.training.realWorld.company + '" not found in COMPANY_CASES');
          }
        }
      }

      return { errors: errors, warnings: warnings, valid: errors.length === 0 };
    }
  };

  // =============================================================================
  // 阅读进度
  // =============================================================================

  function getProgress() {
    return safeJSON(localStorage.getItem(KEY_PROGRESS), {});
  }

  function getBookProgress(slug) {
    var book = BOOK_REGISTRY[slug];
    var total = book ? book.basic.chapters : 0;
    var p = getProgress()[slug];
    var read = 0;
    if (p && p.chaptersRead && p.chaptersRead.length) {
      var seen = {};
      for (var i = 0; i < p.chaptersRead.length; i++) {
        seen[p.chaptersRead[i]] = true;
      }
      read = Math.min(Object.keys(seen).length, total);
    }
    return { read: read, total: total, pct: total ? Math.round(read / total * 100) : 0 };
  }

  function markChapterRead(slug, chapterNum) {
    var progress = getProgress();
    if (!progress[slug]) progress[slug] = { chaptersRead: [] };
    if (progress[slug].chaptersRead.indexOf(chapterNum) === -1) {
      progress[slug].chaptersRead.push(chapterNum);
      safeSet(KEY_PROGRESS, progress);
    }
  }

  function getDomainProgress(domainKey) {
    var domains = DOMAINS_STATIC;
    var domain = null;
    for (var i = 0; i < domains.length; i++) {
      if (domains[i].key === domainKey) { domain = domains[i]; break; }
    }
    if (!domain) return { read: 0, total: 0, pct: 0, started: false, completedBooks: 0 };
    var read = 0, total = 0, completedBooks = 0;
    for (var j = 0; j < domain.books.length; j++) {
      var bp = getBookProgress(domain.books[j].slug);
      read += bp.read;
      total += bp.total;
      if (bp.total > 0 && bp.read >= bp.total) completedBooks++;
    }
    return {
      read: read, total: total,
      pct: total ? Math.round(read / total * 100) : 0,
      started: read > 0,
      completedBooks: completedBooks
    };
  }

  // =============================================================================
  // 原则收藏
  // =============================================================================

  function getPrinciples() {
    return safeJSON(localStorage.getItem(KEY_PRINCIPLES), []);
  }

  function addPrinciple(principle) {
    var principles = getPrinciples();
    for (var i = 0; i < principles.length; i++) {
      if (principles[i].text === principle.text) return false;
    }
    principles.push(principle);
    safeSet(KEY_PRINCIPLES, principles);
    return true;
  }

  function removePrinciple(text) {
    var principles = getPrinciples().filter(function(p) { return p.text !== text; });
    safeSet(KEY_PRINCIPLES, principles);
  }

  // =============================================================================
  // XP 与等级
  // =============================================================================

  function computeXP() {
    var xp = 0, chaptersTotal = 0, completedBooks = 0, startedDomains = 0;
    var slugs = Object.keys(BOOK_REGISTRY);
    for (var i = 0; i < slugs.length; i++) {
      var bp = getBookProgress(slugs[i]);
      chaptersTotal += bp.read;
      if (bp.total > 0 && bp.read >= bp.total) completedBooks++;
    }
    var domains = DOMAINS_STATIC;
    for (var j = 0; j < domains.length; j++) {
      if (getDomainProgress(domains[j].key).started) startedDomains++;
    }
    var principles = getPrinciples().length;
    xp = chaptersTotal * 1 + principles * 2 + completedBooks * 5 + startedDomains * 2;

    // 训练场积分：每完成一个训练层级 +3 XP
    var profile = getAbilityProfile();
    var completedLevels = 0;
    var kpIds = Object.keys(profile.knowledge_points);
    for (var k = 0; k < kpIds.length; k++) {
      var kp = profile.knowledge_points[kpIds[k]];
      var levels = ['concept', 'guided', 'practice', 'real_world'];
      for (var l = 0; l < levels.length; l++) {
        if (kp.levels && kp.levels[levels[l]] && kp.levels[levels[l]].completed) {
          completedLevels++;
        }
      }
    }
    xp += completedLevels * 3;

    return {
      xp: xp,
      chaptersTotal: chaptersTotal,
      completedBooks: completedBooks,
      startedDomains: startedDomains,
      principles: principles
    };
  }

  function computeLevel(xp) {
    var cur = LEVELS[0];
    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xpNeeded) { cur = LEVELS[i]; break; }
    }
    var next = cur.level < 9 ? LEVELS[cur.level] : null;
    return {
      level: cur.level,
      name: cur.name,
      emoji: cur.emoji,
      xpNeeded: cur.xpNeeded,
      next: next
    };
  }

  // =============================================================================
  // 打卡 Streak
  // =============================================================================

  function getStreak() {
    return safeJSON(localStorage.getItem(KEY_STREAK), { dates: [], longest: 0 });
  }

  function markToday() {
    var streak = getStreak();
    var today = new Date().toISOString().slice(0, 10);
    if (streak.dates.indexOf(today) !== -1) return streak;

    streak.dates.push(today);
    streak.dates.sort();

    var current = 1;
    for (var i = streak.dates.length - 2; i >= 0; i--) {
      var prev = new Date(streak.dates[i]);
      var next = new Date(streak.dates[i + 1]);
      if ((next - prev) / 86400000 <= 1.5) {
        current++;
      } else {
        break;
      }
    }
    streak.current = current;
    if (current > streak.longest) streak.longest = current;

    safeSet(KEY_STREAK, streak);
    return streak;
  }

  // =============================================================================
  // 章节阅读时间追踪
  // =============================================================================

  function getReadTimes() {
    return safeJSON(localStorage.getItem(KEY_READ_TIMES), {});
  }

  function recordChapterRead(slug, ch) {
    var times = getReadTimes();
    var key = slug + '_' + ch;
    if (!times[key]) {
      times[key] = new Date().toISOString().slice(0, 10);
      safeSet(KEY_READ_TIMES, times);
    }
    return times[key];
  }

  function getReviewChapters() {
    var times = getReadTimes();
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var reviews = [];

    var timeKeys = Object.keys(times);
    for (var i = 0; i < timeKeys.length; i++) {
      var key = timeKeys[i];
      var parts = key.split('_');
      var slug = parts[0];
      var ch = parseInt(parts[1]);
      var readDate = new Date(times[key] + 'T00:00:00');
      var diffMs = today.getTime() - readDate.getTime();
      var diffDays = Math.floor(diffMs / 86400000);

      var level = null;
      if (diffDays >= 7 && diffDays < 30) level = 7;
      else if (diffDays >= 30 && diffDays < 90) level = 30;
      else if (diffDays >= 90) level = 90;

      if (level) {
        var book = BOOK_REGISTRY[slug];
        if (book) {
          reviews.push({
            slug: slug, ch: ch, title: book.basic.title,
            days: diffDays, level: level
          });
        }
      }
    }

    reviews.sort(function(a, b) { return b.days - a.days; });
    return reviews.slice(0, 5);
  }

  // =============================================================================
  // 概念掌握度（V2 版本，基于 BOOK_REGISTRY.conceptMappings）
  // =============================================================================

  function getConceptMastery(conceptId) {
    var books = QueryEngine.getConceptBooks(conceptId);
    if (books.length === 0) return 0;

    var totalBooks = books.length;
    var readBooks = 0;

    for (var i = 0; i < books.length; i++) {
      var bp = getBookProgress(books[i].slug);
      if (bp.pct >= 50) {
        readBooks++;
      } else if (bp.pct > 0 && bp.pct < 50) {
        readBooks += 0.5;
      }
    }

    return Math.round(Math.min(readBooks / totalBooks, 1) * 100);
  }

  // =============================================================================
  // 能力画像 & 训练场
  // =============================================================================

  function getAbilityProfile() {
    return safeJSON(localStorage.getItem(KEY_ABILITY), {
      version: 1,
      updated_at: null,
      knowledge_points: {}
    });
  }

  function saveAbilityProfile(profile) {
    profile.updated_at = new Date().toISOString();
    safeSet(KEY_ABILITY, profile);
  }

  function getKnowledgePoints(domainKey) {
    if (!domainKey) return KNOWLEDGE_POINTS.slice();
    return KNOWLEDGE_POINTS.filter(function(kp) { return kp.domain === domainKey; });
  }

  function getCompanyCases() { return COMPANY_CASES; }

  function getKpProgress(kpId) {
    var profile = getAbilityProfile();
    var kp = profile.knowledge_points[kpId];
    if (!kp) {
      return {
        completedLevels: 0, masteryPct: 0,
        levels: { concept: false, guided: false, practice: false, real_world: false }
      };
    }
    var completed = 0;
    var levels = ['concept', 'guided', 'practice', 'real_world'];
    for (var i = 0; i < levels.length; i++) {
      if (kp.levels && kp.levels[levels[i]] && kp.levels[levels[i]].completed) completed++;
    }
    return {
      completedLevels: completed,
      masteryPct: completed * 25,
      levels: {
        concept: kp.levels && kp.levels.concept && kp.levels.concept.completed,
        guided: kp.levels && kp.levels.guided && kp.levels.guided.completed,
        practice: kp.levels && kp.levels.practice && kp.levels.practice.completed,
        real_world: kp.levels && kp.levels.real_world && kp.levels.real_world.completed
      }
    };
  }

  function markLevelCompleted(kpId, levelName, extraData) {
    var profile = getAbilityProfile();
    if (!profile.knowledge_points[kpId]) {
      var kpDef = QueryEngine.findKpById(kpId);
      if (!kpDef) return false;
      profile.knowledge_points[kpId] = {
        domain: kpDef.domain,
        name: kpDef.name,
        levels: { concept: {}, guided: {}, practice: {}, real_world: {} },
        mastery_pct: 0
      };
    }
    var kp = profile.knowledge_points[kpId];
    if (!kp.levels) kp.levels = { concept: {}, guided: {}, practice: {}, real_world: {} };
    kp.levels[levelName] = { completed: true, completed_at: new Date().toISOString() };
    if (extraData) {
      var extraKeys = Object.keys(extraData);
      for (var i = 0; i < extraKeys.length; i++) {
        kp.levels[levelName][extraKeys[i]] = extraData[extraKeys[i]];
      }
    }

    var completed = 0;
    var levels = ['concept', 'guided', 'practice', 'real_world'];
    for (var j = 0; j < levels.length; j++) {
      if (kp.levels[levels[j]] && kp.levels[levels[j]].completed) completed++;
    }
    kp.mastery_pct = completed * 25;

    saveAbilityProfile(profile);
    return true;
  }

  function computeDomainMastery(domainKey) {
    var kpList = KNOWLEDGE_POINTS.filter(function(kp) { return kp.domain === domainKey; });
    if (kpList.length === 0) return null;
    var totalMastery = 0;
    for (var i = 0; i < kpList.length; i++) {
      var progress = getKpProgress(kpList[i].id);
      totalMastery += progress.masteryPct;
    }
    return Math.round(totalMastery / kpList.length);
  }

  // =============================================================================
  // 向后兼容桥接层 — 模拟旧 data.js API
  // =============================================================================

  /**
   * 构建旧版 BOOK_META 结构
   */
  function buildBookMeta() {
    var meta = {};
    var slugs = Object.keys(BOOK_REGISTRY);
    for (var i = 0; i < slugs.length; i++) {
      var b = BOOK_REGISTRY[slugs[i]];
      meta[slugs[i]] = {
        title: b.basic.title,
        chapters: b.basic.chapters,
        school: b.basic.school,
        schoolName: b.basic.schoolName
      };
    }
    return meta;
  }

  var BOOK_META = buildBookMeta();

  /**
   * 从 BOOK_REGISTRY 构建的静态域结构
   */
  var DOMAINS_STATIC = QueryEngine.buildDomains();

  // =============================================================================
  // 公开 API
  // =============================================================================

  return {
    // --- 数据源头 ---
    BOOK_REGISTRY: BOOK_REGISTRY,
    CONCEPTS: CONCEPTS,
    CONCEPT_QUOTES: CONCEPT_QUOTES,
    LEVELS: LEVELS,
    LV_COLOR: LV_COLOR,
    LV_EMOJI: LV_EMOJI,

    // --- 向后兼容桥接 ---
    BOOK_META: BOOK_META,
    DOMAINS: DOMAINS_STATIC,
    KNOWLEDGE_POINTS: KNOWLEDGE_POINTS,
    COMPANY_CASES: COMPANY_CASES,

    // --- V2 查询方法 ---
    getBookPromptInfo: function(slug) {
      return QueryEngine.getBookPromptInfo(slug);
    },
    getConceptBooks: function(conceptId) {
      return QueryEngine.getConceptBooks(conceptId);
    },
    getBookConcepts: function(slug) {
      return QueryEngine.getBookConcepts(slug);
    },
    getBookKnowledgePoints: function(slug, domainKey) {
      return QueryEngine.getBookKnowledgePoints(slug, domainKey);
    },
    getConceptKnowledgePoints: function(conceptId) {
      return QueryEngine.getConceptKnowledgePoints(conceptId);
    },
    getKpBooks: function(kpId) {
      return QueryEngine.getKpBooks(kpId);
    },
    getDomainKnowledgePoints: function(domainKey) {
      return getKnowledgePoints(domainKey);
    },
    findConceptById: function(id) {
      return QueryEngine.findConceptById(id);
    },
    findKpById: function(id) {
      return QueryEngine.findKpById(id);
    },

    // --- 旧版兼容方法 ---
    getBook: function(slug) {
      return BOOK_META[slug] || null;
    },
    getAllBooks: function() {
      var slugs = Object.keys(BOOK_META);
      return slugs.map(function(k) { return BOOK_META[k]; });
    },

    // --- 进度 ---
    getProgress: getProgress,
    getBookProgress: getBookProgress,
    getDomainProgress: getDomainProgress,
    markChapterRead: markChapterRead,

    // --- 原则 ---
    getPrinciples: getPrinciples,
    addPrinciple: addPrinciple,
    removePrinciple: removePrinciple,

    // --- XP ---
    computeXP: computeXP,
    computeLevel: computeLevel,

    // --- Streak ---
    getStreak: getStreak,
    markToday: markToday,

    // --- 章节回访 ---
    recordChapterRead: recordChapterRead,
    getReadTimes: getReadTimes,
    getReviewChapters: getReviewChapters,

    // --- 概念掌握度 ---
    getConceptMastery: getConceptMastery,

    // --- 能力画像 & 训练场 ---
    getAbilityProfile: getAbilityProfile,
    saveAbilityProfile: saveAbilityProfile,
    getKnowledgePoints: getKnowledgePoints,
    getCompanyCases: getCompanyCases,
    getKpProgress: getKpProgress,
    markLevelCompleted: markLevelCompleted,
    computeDomainMastery: computeDomainMastery,

    // --- 验证 ---
    validate: function() {
      return QueryEngine.validate();
    },

    // --- 工具 ---
    safeJSON: safeJSON
  };
})();

// 全局别名：让所有使用 AppData 的旧代码直接使用新引擎
var AppData = AppDataV2;

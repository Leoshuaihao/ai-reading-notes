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
      ]
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
      ]
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
      ]
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
      ]
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
      ]
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
      ]
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

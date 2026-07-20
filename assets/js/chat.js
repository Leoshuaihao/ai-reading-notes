/**
 * AI精读笔记 — AI对话模块
 * 支持 DeepSeek API 真实调用，带降级模拟模式
 */
(function() {
  'use strict';

  // ==================== 配置 ====================
  // 生产环境：通过 Cloudflare Workers 代理调用 DeepSeek API
  var WORKER_URL = 'https://ai-reading-api-proxy.neo-lab.workers.dev';
  var API_ENDPOINT = WORKER_URL + '/api/chat';
  // API_KEY 由 Worker 代理管理，前端不持有密钥
  var API_KEY = '';
  var MODEL = 'deepseek-chat';
  var USE_REAL_API = true;    // Worker 已部署，启用真实 AI
  var DAILY_LIMIT = 20;            // 免费用户每日轮数
  var RATE_LIMIT_WINDOW = 10000;   // 10秒窗口
  var RATE_LIMIT_MAX = 5;          // 窗口内最多5条
  var MAX_HISTORY = 30;            // 最多保留30轮对话
  var REQUEST_TIMEOUT = 15000;     // API请求超时

  // 本地速率限制追踪
  var messageTimestamps = [];

  // ==================== 对话切换 ====================
  window.toggleChat = function(widgetId) {
    var w = document.getElementById(widgetId);
    if (!w) return;
    var isOpening = !w.classList.contains('open');
    w.classList.toggle('open');

    var header = w.querySelector('.chat-header');
    if (header) header.setAttribute('aria-expanded', isOpening ? 'true' : 'false');

    if (isOpening) {
      var body = w.querySelector('.chat-body');
      if (body) body.scrollTop = body.scrollHeight;
      // 恢复对话历史
      restoreChatHistory(widgetId);
    }
  };

  // ==================== 发送消息 ====================
  window.sendChat = function(widgetId, inputEl) {
    var msg = inputEl.value.trim();
    if (!msg) return;

    var w = document.getElementById(widgetId);
    if (!w) return;

    // 频率限制检查
    if (!checkRateLimit(w)) return;

    // 检查每日限制
    if (!checkDailyLimit(w)) return;

    // 离线检查
    if (!navigator.onLine) {
      showError(w, '📡 当前处于离线状态，请检查网络连接后再试。');
      return;
    }

    var body = w.querySelector('.chat-body');
    var typing = w.querySelector('.typing-indicator');
    var sendBtn = w.querySelector('.chat-input-area button');

    // 添加用户消息
    appendMessage(body, 'user', msg);
    inputEl.value = '';
    body.scrollTop = body.scrollHeight;

    // 发送按钮禁用
    if (sendBtn) sendBtn.disabled = true;

    // 显示打字指示器
    if (typing) typing.style.display = 'block';

    // 获取对话上下文
    var chapterInfo = getChapterContext(w);

    if (USE_REAL_API) {
      sendToAPI(widgetId, msg, chapterInfo, body, typing, sendBtn);
    } else {
      // file:// 协议下模拟模式（本地开发用）
      simulateResponse(msg, body, typing, sendBtn);
    }
  };

  // ==================== 书籍 → 作者人设映射 ====================
  var BOOK_PROMPTS = {
    'fisher':              { author: 'Philip A. Fisher',   book: 'Common Stocks and Uncommon Profits' },

    'market-cycle':        { author: 'Howard Marks',       book: '周期' },
    'buffett-letters':     { author: 'Warren Buffett',      book: '巴菲特致股东的信' },
    'alchemy-finance':     { author: 'George Soros',       book: '金融炼金术' },
    'poor-charlie':        { author: 'Charlie Munger',     book: '穷查理宝典' },
    'intelligent-investor': { author: 'Benjamin Graham',    book: '聪明的投资者' },
    'peter-lynch':         { author: 'Peter Lynch',        book: '彼得·林奇的成功投资' },
    'security-analysis':   { author: 'Benjamin Graham',    book: '证券分析' },
    'beating-street':      { author: 'Peter Lynch',        book: '战胜华尔街' },
    'stock-operator':      { author: 'Jesse Livermore',   book: '股票大作手回忆录' },
    'economic-moat':      { author: 'Pat Dorsey',         book: '巴菲特的护城河' },
    'fooled-by-randomness': { author: 'Nassim Taleb',      book: '随机漫步的傻瓜' },
    'black-swan':          { author: 'Nassim Taleb',       book: '黑天鹅' },
    'antifragile':         { author: 'Nassim Taleb',       book: '反脆弱' },
    'principles':          { author: 'Ray Dalio',          book: '原则' },
    'random-walk':         { author: 'Burton Malkiel',     book: '漫步华尔街' },
    'richdad':             { author: 'Robert Kiyosaki',    book: '富爸爸穷爸爸' }
  };

  function getBookSlug() {
    var m = window.location.pathname.match(/books\/([^/]+)/);
    return m ? m[1] : '';
  }

  // ==================== System Prompt 构建（按当前书动态生成） ====================
  function buildPrompt(chapterInfo) {
    var slug = getBookSlug();
    var info = BOOK_PROMPTS[slug] || { author: '投资大师', book: '投资经典' };
    return '你是投资导师，扮演' + info.author + '（《' + info.book + '》作者）。\n\n' +
      '与中文读者讨论书中的思考题。原则：\n' +
      '1. 苏格拉底式提问引导读者说出想法，不直接给答案\n' +
      '2. 引用书中原文深化讨论\n' +
      '3. 通俗中文，偶尔保留关键英文术语\n' +
      '4. 语气温和有挑战性，像一位严厉但关心你的导师\n' +
      '5. 每次回复150字以内，聚焦一个点\n\n' +
      '当前章节：' + (chapterInfo.chapterTitle || '未知') + '\n' +
      '如果用户问与投资完全无关或涉及敏感话题，请礼貌表示只能讨论本书相关投资话题。';
  }

  // ==================== 真实API调用（直连DeepSeek，MVP阶段） ====================
  function sendToAPI(widgetId, msg, chapterInfo, body, typing, sendBtn) {
    var history = getChatHistory(widgetId);
    var systemPrompt = buildPrompt(chapterInfo);

    var messages = [{ role: 'system', content: systemPrompt }];
    if (history && history.length > 0) {
      messages = messages.concat(history.slice(-20));
    }
    messages.push({ role: 'user', content: msg });

    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, REQUEST_TIMEOUT);

    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 600,
        temperature: 0.7,
        stream: false
      }),
      signal: controller.signal
    })
    .then(function(response) {
      clearTimeout(timeoutId);
      if (!response.ok) {
        return response.json().then(function(data) {
          throw new Error(data.error && data.error.message ? data.error.message : 'API 错误: ' + response.status);
        }).catch(function(e) {
          if (e.message && e.message.indexOf('API 错误') === -1) throw e;
          throw new Error('AI 服务暂时不可用 (HTTP ' + response.status + ')');
        });
      }
      return response.json();
    })
    .then(function(data) {
      if (typing) typing.style.display = 'none';
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        var reply = data.choices[0].message.content;
        appendMessage(body, 'ai', reply);
        saveChatHistory(widgetId, { role: 'user', content: msg });
        saveChatHistory(widgetId, { role: 'assistant', content: reply });
        incrementDailyCount();
      } else {
        appendMessage(body, 'ai', 'AI暂时无法生成回复，请换个角度再问一次。');
      }
      body.scrollTop = body.scrollHeight;
      if (sendBtn) sendBtn.disabled = false;
    })
    .catch(function(err) {
      clearTimeout(timeoutId);
      if (typing) typing.style.display = 'none';
      if (err.name === 'AbortError') {
        appendMessage(body, 'ai', '⏱️ 响应较慢，请稍候或稍后再试。');
      } else {
        appendMessage(body, 'ai', '⚠️ ' + (err.message || 'AI暂时无法回应，请稍后再试。'));
      }
      body.scrollTop = body.scrollHeight;
      if (sendBtn) sendBtn.disabled = false;
    });
  }

  // ==================== 模拟响应（本地 file:// 开发 / 未部署 Worker 时使用） ====================
  // 按书 slug 生成对应作者人设的模拟回复
  var SIMULATE_RESPONSES = {
    'fisher': [
      'Fisher会说，关键不在于<strong>市场怎么样</strong>，而在于<strong>你持有的公司怎么样</strong>。用15条原则来检验一下你关注的公司？',
      'Fisher会追问：<strong>你的判断基于什么信息？</strong>读了财报？还是像他说的那样——跟客户、供应商、竞争对手聊过了？',
      '费雪认为<strong>闲聊法</strong>是了解公司最有效的途径。你最近是否有跟业内人士深入聊过你关注的公司？',
      '15条原则里的第一条：<strong>这家公司的产品或服务在未来几年有持续增长的潜力吗？</strong>你能回答这个问题吗？',
      '费雪说<strong>卖出只有三个理由</strong>：看错了、公司变了、有更好的选择。你现在面临的是哪一种？'
    ],

    'poor-charlie': [
      '芒格会说：<strong>反过来想，总是反过来想。</strong>如果你想知道如何成功，先研究如何失败。',
      '芒格的<strong>多元思维模型</strong>提醒我们：不要只用一个学科的工具。你能从心理学、经济学、物理学三个角度同时看这个问题吗？',
      '芒格说：<strong>我这辈子遇到的聪明人没有一个不每天阅读的。</strong>你多久没有深度阅读了？',
      '人类误判心理学第1条：<strong>奖励和惩罚超级反应倾向。</strong>你现在的决策是否受到了激励机制的扭曲？',
      '芒格的核心智慧：<strong>获取智慧是一种道德责任。</strong>你从最近的错误中学到了什么原则？'
    ],
    'intelligent-investor': [
      '格雷厄姆会说：<strong>安全边际是投资的核心</strong>。你为这家公司支付的价格，留出了足够的安全边际吗？',
      '格雷厄姆的"市场先生"寓言提醒我们：<strong>市场是来服务你的，不是来指导你的。</strong>你是在被市场牵着走吗？',
      '格雷厄姆区分了<strong>投资与投机</strong>。你现在做的是基于深入分析的保本行为，还是靠猜测？',
      '防御型投资者的第一个原则：<strong>不要把所有鸡蛋放在一个篮子里，但也不要放在太多篮子里。</strong>你的组合够分散吗？',
      '格雷厄姆会追问：<strong>你能算清楚内在价值吗？</strong>如果不能，安全边际就无从谈起。'
    ],
    'peter-lynch': [
      '林奇会说：<strong>投资你了解的东西。</strong>你能在日常生活中观察到这家公司的产品或服务吗？',
      '林奇会追问：<strong>这家公司的故事讲完了吗？</strong>好公司的故事会持续多年，别因为涨了一点就卖掉。',
      '林奇的六种公司分类：<strong>缓慢增长、稳定增长、快速增长、周期型、困境反转型、隐蔽资产型。</strong>你关注的是哪一种？',
      '林奇说：<strong>业余投资者如果善用自己的优势，可以战胜华尔街专业投资者。</strong>你的信息优势在哪里？',
      'PEG比率是林奇的招牌：<strong>PE除以增长率。</strong>PEG小于1才算合理。你算过吗？'
    ],
    'black-swan': [
      '塔勒布会提醒你：<strong>真正改变历史的事件是不可预测的。</strong>你的投资组合能承受黑天鹅吗？',
      '塔勒布会说：<strong>我们总是在事后为随机事件编造解释。</strong>你确定自己的判断不是后视镜偏误吗？',
      '塔勒布的<strong>杠铃策略</strong>：90%极度保守 + 10%极度激进。你现在是极端还是中庸？',
      '肥尾分布意味着<strong>极端事件比你想象的频繁得多。</strong>你的风险管理考虑到了这个吗？',
      '塔勒布的核心洞察：<strong>不要试图预测黑天鹅，确保你站在受益的一侧。</strong>'
    ],
    'antifragile': [
      '塔勒布会说：<strong>脆弱的反义词不是坚韧，而是反脆弱。</strong>你的投资组合能从波动中受益吗？',
      '塔勒布会追问：<strong>如果最坏的情况发生了，你会怎样？</strong>如果答案是"毁灭"，那你的仓位就太大了。',
      '反脆弱的核心：<strong>通过可承受的小损失换取巨大收益。</strong>你的策略具有这种不对称性吗？',
      '塔勒布说：<strong>时间是最好的反脆弱检测器。</strong>你的投资逻辑能穿越时间吗？',
      'Skin in the game：<strong>没有风险共担的建议不值得听。</strong>给你建议的人自己也承担风险吗？'
    ],
    'principles': [
      '达利欧会说：<strong>痛苦+反思=进步。</strong>你描述的这个经历，你从中提炼出了什么原则？',
      '达利欧会追问：<strong>你的决策是基于原则还是情绪？</strong>如果是原则，它经得起反复检验吗？',
      '达利欧的<strong>极度透明</strong>原则：你敢把你现在的决策逻辑公开给你的团队看吗？',
      '桥水的核心方法：<strong>可信度加权决策。</strong>你对这个领域有多少可信度？',
      '五步流程：<strong>目标→问题→诊断→设计→执行。</strong>你现在卡在哪一步？'
    ],
    'random-walk': [
      '马尔基尔会提醒你：<strong>短期股价走势是随机漫步。</strong>你确定自己能预测市场吗？',
      '马尔基尔会说：<strong>长期来看，低成本指数基金能跑赢大多数主动管理。</strong>你的投资为什么能例外？',
      '技术分析能赚钱吗？马尔基尔说：<strong>蒙住眼睛的猴子掷飞镖选股的表现不比专家差。</strong>',
      '马尔基尔的建议：<strong>定投指数基金，长期持有。</strong>你现在的策略比这个更好吗？',
      '行为金融学告诉我们：<strong>投资者是自己的最大敌人。</strong>你最近因为情绪做了哪些后悔的决策？'
    ],
    'richdad': [
      '清崎会问你：<strong>这是资产还是负债？</strong>资产把钱放进口袋，负债把钱拿走。你描述的东西是哪一种？',
      '清崎会说：<strong>富人不为钱工作，而是让钱为自己工作。</strong>你现在的现金流是主动收入还是被动收入？',
      '富爸爸的核心教训：<strong>学校教你如何为钱工作，但从没教你如何让钱为你工作。</strong>你缺的是财商教育吗？',
      '清崎的ESBI四象限：<strong>雇员、自由职业者、企业家、投资者。</strong>你现在在哪一个？想往哪个走？',
      '财商的核心技能：<strong>会计、投资、市场、法律。</strong>这四个里面你最弱的是哪个？'
    ],
    'market-cycle': [
      '马克斯会问：<strong>你现在能判断市场处于哪个周期阶段吗？</strong>牛市初期、中期、还是狂热末期？',
      '周期的本质是什么？马克斯会说：<strong>过度乐观和过度悲观交替出现。</strong>现在市场处于哪一端？',
      '马克斯说：<strong>知道我们在周期中的位置，比预测未来更重要。</strong>你能找到位置信号吗？'
    ],
    'buffett-letters': [
      '巴菲特在信中反复强调：<strong>以股东为导向的管理层是稀缺品。</strong>你关注的公司管理层如何？',
      '巴菲特说：<strong>会计数字是商业思考的起点，不是终点。</strong>你能透过报表看到真实的经济价值吗？',
      '伯克希尔的核心原则：<strong>我们只投资我们能理解的企业。</strong>你对自己的能力圈清楚吗？'
    ],
    'alchemy-finance': [
      '索罗斯会说：<strong>市场总是错的。</strong>你关注的市场目前存在什么认知偏差？',
      '索罗斯的反身性理论：<strong>投资者的认知会改变基本面。</strong>你观察到这种自我实现的现象了吗？',
      '索罗斯的核心方法：<strong>先假设自己是错的，然后找证据。</strong>你敢这样检验自己的投资吗？'
    ],
    'beating-street': [
      '林奇在麦哲伦基金的经验：<strong>不要因为股价翻倍就卖掉，好公司的增长才刚刚开始。</strong>',
      '林奇的选股方法：<strong>从生活中找灵感。</strong>你最近用了什么好产品？那家公司上市了吗？',
      '林奇说：<strong>业余投资者有专业投资者没有的优势。</strong>你的优势是什么？'
    ],
    'stock-operator': [
      '利弗莫尔会提醒你：<strong>华尔街没有新鲜事，因为人性永不改变。</strong>你现在的情绪是什么？恐惧还是贪婪？',
      '利弗莫尔的核心教训：<strong>永远不要和市场争辩。</strong>你最近有没有固执己见导致亏损？',
      '大作手的原则：<strong>赚大钱靠的是坐着不动。</strong>你是否有足够的耐心等待趋势？'
    ],
    'economic-moat': [
      '多尔西的四类护城河：<strong>无形资产、转换成本、网络效应、成本优势。</strong>你关注的公司属于哪一种？',
      '多尔西的核心方法：<strong>护城河分析是估值的前提。</strong>没有护城河的公司，你怎么估值？',
      '巴菲特说：<strong>我们要的是被宽阔护城河保护的经济城堡。</strong>你找到这样的城堡了吗？'
    ],
    'fooled-by-randomness': [
      '塔勒布会提醒你：<strong>幸存者偏差让你只看到成功者。</strong>你见过多少和你做法一样但失败的人？',
      '塔勒布说：<strong>我们低估了运气在成功中的作用。</strong>你的成功有多少是运气，多少是能力？',
      '历史只是<strong>一种可能性</strong>的实现。如果历史重演一千次，你的策略能赢多少次？'
    ],
    'security-analysis': [
      '格雷厄姆会问：<strong>你确定自己是在投资而不是投机吗？</strong>两者的区别你清楚吗？',
      '证券分析的核心：<strong>价格是你支付的，价值是你得到的。</strong>你能算清楚这两个数字吗？',
      '格雷厄姆和多德的方法：<strong>从资产负债表开始，而不是利润表。</strong>你关注过公司的清算价值吗？'
    ]
  };

  // 通用模拟回复（未在映射中的书）
  var GENERIC_RESPONSES = [
    '这是一个很好的角度。<strong>先说说你的直觉</strong>——不用管对错，你是怎么想到这个问题的？',
    '有意思的观点。<strong>你的判断基于什么信息？</strong>是实际调研，还是听来的观点？',
    '让我换个角度问你：<strong>如果最坏的情况发生，你能承受吗？</strong>这往往是投资决策的真正考验。',
    '投资没有标准答案。<strong>关键是你有没有一套自己的思考框架？</strong>能简单说说你的框架吗？',
    '这个问题让我想起一个核心原则：<strong>知道你不知道什么，比知道你知道什么更重要。</strong>你同意吗？'
  ];

  function simulateResponse(msg, body, typing, sendBtn) {
    setTimeout(function() {
      if (typing) typing.style.display = 'none';

      var slug = getBookSlug();
      var pool = SIMULATE_RESPONSES[slug] || GENERIC_RESPONSES;
      var response = pool[Math.floor(Math.random() * pool.length)];
      appendMessage(body, 'ai', response);
      body.scrollTop = body.scrollHeight;
      if (sendBtn) sendBtn.disabled = false;
    }, 1500 + Math.random() * 1000);
  }

  // ==================== 辅助函数 ====================
  function appendMessage(body, role, text) {
    var msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg ' + role;
    var avatar = role === 'user' ? '👤' : '🤖';
    msgDiv.innerHTML = '<div class="avatar">' + avatar + '</div><div class="bubble">' + escapeHtml(text) + '</div>';
    body.appendChild(msgDiv);
  }

  function showError(w, text) {
    var errorEl = w.querySelector('.chat-error');
    if (errorEl) {
      errorEl.textContent = text;
      errorEl.style.display = 'block';
      setTimeout(function() { errorEl.style.display = 'none'; }, 4000);
    } else {
      var body = w.querySelector('.chat-body');
      appendMessage(body, 'ai', text);
    }
  }

  function getChapterContext(w) {
    var card = w.closest('.chapter-card');
    if (!card) return { chapterId: 'unknown', chapterTitle: '未知章节' };
    var titleEl = card.querySelector('.ch-title');
    return {
      chapterId: card.id || 'unknown',
      chapterTitle: titleEl ? titleEl.textContent.trim() : '未知章节'
    };
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== 速率限制 ====================
  function checkRateLimit(w) {
    var now = Date.now();
    messageTimestamps = messageTimestamps.filter(function(t) { return now - t < RATE_LIMIT_WINDOW; });
    messageTimestamps.push(now);
    if (messageTimestamps.length > RATE_LIMIT_MAX) {
      showError(w, '⚡ 发送太快，请稍候再试。');
      return false;
    }
    return true;
  }

  function checkDailyLimit(w) {
    // 付费会员无限制
    if (isPremium()) return true;

    try {
      var today = new Date().toISOString().split('T')[0];
      var key = 'chat_daily_' + today;
      var count = parseInt(localStorage.getItem(key) || '0', 10);
      if (count >= DAILY_LIMIT) {
        showError(w, '<div style="text-align:center;padding:8px 0;">'
          + '<p style="font-size:16px;margin-bottom:8px;">📊 今日对话次数已用完（' + DAILY_LIMIT + '轮/天）</p>'
          + '<p style="font-size:13px;color:var(--text-secondary);">升级会员享<strong>无限对话</strong> + 云同步</p>'
          + '<button onclick="openAuth(\'signup\')" style="margin-top:8px;padding:8px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;">✨ 升级会员 ¥9.9/月</button>'
          + '</div>');
        return false;
      }
    } catch(e) { /* localStorage不可用时跳过限制 */ }
    return true;
  }

  function isPremium() {
    if (!window.__SUPABASE_ENABLED__) return false;
    var user = window.SupabaseAuth && window.SupabaseAuth.getUser();
    if (!user) return false;
    // 检查用户 membership_level（从 localStorage 缓存读取）
    var membership = localStorage.getItem('membership_level');
    return membership === 'premium';
  }

  function incrementDailyCount() {
    try {
      var today = new Date().toISOString().split('T')[0];
      var key = 'chat_daily_' + today;
      var count = parseInt(localStorage.getItem(key) || '0', 10);
      localStorage.setItem(key, (count + 1).toString());
    } catch(e) { /* 静默降级 */ }
  }

  // ==================== 对话历史持久化 ====================
  function getChatHistory(widgetId) {
    try {
      var key = 'chat_hist_' + widgetId;
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  }

  function saveChatHistory(widgetId, message) {
    try {
      var key = 'chat_hist_' + widgetId;
      var history = getChatHistory(widgetId);
      history.push(message);
      // 最多保留30轮
      if (history.length > MAX_HISTORY * 2) {
        history = history.slice(-MAX_HISTORY * 2);
      }
      localStorage.setItem(key, JSON.stringify(history));
    } catch(e) {
      // QuotaExceededError：静默降级
      console.warn('对话历史保存失败，可能存储空间不足');
    }
  }

  function restoreChatHistory(widgetId) {
    // 原型阶段：预设对话已在HTML中，不需要额外恢复
    // 后续真实API阶段：从localStorage恢复历史对话到UI
  }

  // ==================== 移动端键盘适配 ====================
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function() {
      var activeChat = document.querySelector('.chat-widget.open');
      if (activeChat) {
        var body = activeChat.querySelector('.chat-body');
        if (body) {
          setTimeout(function() { body.scrollTop = body.scrollHeight; }, 100);
        }
      }
    });
  }

  // ==================== 输入框回车发送 ====================
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      var input = e.target;
      if (input && input.closest && input.closest('.chat-input-area') && input.tagName === 'INPUT') {
        e.preventDefault();
        var widget = input.closest('.chat-widget');
        if (widget) {
          window.sendChat(widget.id, input);
        }
      }
    }
  });

})();

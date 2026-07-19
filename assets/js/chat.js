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
    'howard-marks':        { author: 'Howard Marks',       book: '投资最重要的事' },
    'buffett':             { author: 'Warren Buffett',      book: '巴菲特之道' },
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
      '让我用Fisher的框架来分析...Fisher会说，关键不在于<strong>市场怎么样</strong>，而在于<strong>你持有的公司怎么样</strong>。要不要试着用15条原则来检验一下？',
      'Fisher可能会追问你：<strong>你的判断基于什么信息？</strong>读了财报？还是像他说的那样——跟客户、供应商、竞争对手聊过了？'
    ],
    'howard-marks': [
      'Marks会提醒你：<strong>市场在恐惧与贪婪之间永恒摇摆</strong>。你描述的这个判断，是在钟摆的哪一端做出的？',
      '投资最重要的事是什么？Marks会说——<strong>第二层思维</strong>。你的想法和大众一样吗？如果一样，那可能就是错的。'
    ],
    'buffett': [
      '巴菲特会问你：<strong>这是好生意吗？你能理解它吗？价格有吸引力吗？</strong>三个问题，一个都不能少。',
      '巴菲特常说：<strong>别人贪婪时我恐惧，别人恐惧时我贪婪。</strong>你现在的判断，是在跟随大众还是逆向而行？'
    ],
    'poor-charlie': [
      '芒格会说：<strong>反过来想，总是反过来想。</strong>如果你想知道如何成功，先研究如何失败。',
      '芒格的多元思维模型提醒我们：<strong>不要只用一个学科的工具</strong>。心理学、经济学、物理学——它们都能照亮同一个问题。'
    ],
    'intelligent-investor': [
      '格雷厄姆会说：<strong>安全边际是投资的核心</strong>。你为这家公司支付的价格，留出了足够的安全边际吗？',
      '格雷厄姆的"市场先生"寓言提醒我们：<strong>市场是来服务你的，不是来指导你的</strong>。你是在被市场牵着走吗？'
    ],
    'peter-lynch': [
      '林奇会说：<strong>投资你了解的东西</strong>。你能在日常生活中观察到这家公司的产品或服务吗？',
      '林奇会追问：<strong>这家公司的故事讲完了吗？</strong>好公司的故事会持续多年，别因为涨了一点就卖掉。'
    ],
    'black-swan': [
      '塔勒布会提醒你：<strong>真正改变历史的事件是不可预测的</strong>。你的投资组合能承受黑天鹅吗？',
      '塔勒布会说：<strong>我们总是在事后为随机事件编造解释</strong>。你确定自己的判断不是后视镜偏误吗？'
    ],
    'antifragile': [
      '塔勒布会说：<strong>脆弱的反义词不是坚韧，而是反脆弱</strong>。你的投资组合能从波动中受益吗？',
      '塔勒布会追问：<strong>如果最坏的情况发生了，你会怎样？</strong>如果答案是"毁灭"，那你的仓位就太大了。'
    ],
    'principles': [
      '达利欧会说：<strong>痛苦+反思=进步</strong>。你描述的这个经历，你从中提炼出了什么原则？',
      '达利欧会追问：<strong>你的决策是基于原则还是情绪？</strong>如果是原则，它经得起反复检验吗？'
    ],
    'random-walk': [
      '马尔基尔会提醒你：<strong>短期股价走势是随机漫步</strong>。你确定自己能预测市场吗？还是只是运气好？',
      '马尔基尔会说：<strong>长期来看，低成本指数基金能跑赢大多数主动管理</strong>。你的投资为什么能例外？'
    ],
    'richdad': [
      '清崎会问你：<strong>这是资产还是负债？</strong>资产把钱放进口袋，负债把钱拿走。你描述的东西是哪一种？',
      '清崎会说：<strong>富人为钱工作，还是让钱为自己工作？</strong>你现在的选择是哪一种？'
    ]
  };

  // 通用模拟回复（未在映射中的书）
  var GENERIC_RESPONSES = [
    '这是一个很好的角度。<strong>先说说你的直觉</strong>——不用管对错，你是怎么想到这个问题的？',
    '有意思的观点。<strong>你的判断基于什么信息？</strong>是实际调研，还是听来的观点？',
    '让我换个角度问你：<strong>如果最坏的情况发生，你能承受吗？</strong>这往往是投资决策的真正考验。'
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

/**
 * AI精读笔记 — AI对话模块
 * 支持 DeepSeek API 真实调用，带降级模拟模式
 */
(function() {
  'use strict';

  // ==================== 配置 ====================
  // MVP阶段：前端直连 DeepSeek API（后续迁移到 Cloudflare Workers 代理）
  var API_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
  var API_KEY = 'sk-85d9e3305bef4a47b3417f3eb3f93e2c';
  var MODEL = 'deepseek-chat';
  // 开发阶段：检测是否在本地 file:// 协议下，是则用模拟模式
  var IS_LOCAL = window.location.protocol === 'file:';
  var USE_REAL_API = !IS_LOCAL;    // 非本地自动启用真实API
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

  // ==================== 真实API调用（直连DeepSeek，MVP阶段） ====================
  function sendToAPI(widgetId, msg, chapterInfo, body, typing, sendBtn) {
    var history = getChatHistory(widgetId);

    // 构建 System Prompt
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
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
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

  // 构建苏格拉底式 System Prompt
  function buildPrompt(chapterInfo) {
    return '你是投资导师，扮演Philip A. Fisher（《Common Stocks and Uncommon Profits》作者）。\n\n' +
      '与中文读者讨论书中的思考题。原则：\n' +
      '1. 苏格拉底式提问引导读者说出想法，不直接给答案\n' +
      '2. 引用书中原文深化讨论\n' +
      '3. 通俗中文，偶尔保留关键英文术语\n' +
      '4. 语气温和有挑战性，像一位严厉但关心你的导师\n' +
      '5. 每次回复150字以内，聚焦一个点\n\n' +
      '当前章节：' + (chapterInfo.chapterTitle || '未知') + '\n' +
      '如果用户问与投资完全无关或涉及敏感话题，请礼貌表示只能讨论本书相关投资话题。';
  }

  // ==================== 模拟响应（本地 file:// 开发） ====================
  function simulateResponse(msg, body, typing, sendBtn) {
    setTimeout(function() {
      if (typing) typing.style.display = 'none';

      var responses = [
        '这是一个很好的角度！让我用Fisher的框架来帮你分析一下...<br><br>Fisher会说，关键不在于<strong>市场怎么样</strong>，而在于<strong>你持有的公司怎么样</strong>。如果你持有的是一家真正卓越的公司，市场波动只是噪音。<br><br>要不要试着用下一章的15条原则来检验一下你想到的那家公司？',

        '有意思的观点。Fisher可能会追问你：<strong>你的这个判断是基于什么信息做出的？</strong>是读了财报？听了别人的推荐？还是像他说的那样——跟公司的客户、供应商、竞争对手聊过了？<br><br>深度调研和道听途说，是两种完全不同的认知。',

        '你提出了一个Fisher本人也经常思考的问题。让我引用他在书中的原话...<br><br>其实Fisher的方法论最核心的一点就是：<strong>不要试图预测市场，而是去理解企业。</strong>市场不可预测，但企业的竞争力是可以调研的。<br><br>你觉得在你的投资经验中，哪一次判断是基于"理解企业"而不是"预测市场"？',

        '这是个好问题。让我换个角度——如果Fisher今天还活着，他可能会说：<strong>用Scuttlebutt Method去调研，而不是坐在屏幕前看K线图。</strong><br><br>比如说，你可以试试去你想投资的那家公司的门店转转、跟它的用户聊聊、在脉脉上看看前员工的评价。这些信息比任何技术指标都更有价值。'
      ];

      var response = responses[Math.floor(Math.random() * responses.length)];
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
    try {
      var today = new Date().toISOString().split('T')[0];
      var key = 'chat_daily_' + today;
      var count = parseInt(localStorage.getItem(key) || '0', 10);
      if (count >= DAILY_LIMIT) {
        showError(w, '📊 今日对话次数已用完（' + DAILY_LIMIT + '轮/天），明天再来吧！');
        return false;
      }
    } catch(e) { /* localStorage不可用时跳过限制 */ }
    return true;
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

/**
 * AI精读笔记 — 核心交互逻辑
 * 包含：折叠/展开、导航高亮、进度条、浮动TOC、AI对话、展开状态持久化
 */
(function() {
  'use strict';

  // ==================== 折叠/展开（修复评审H1：使用scrollHeight动态计算） ====================
  document.querySelectorAll('.chapter-card').forEach(function(card) {
    var blocks = card.querySelectorAll('.block');
    if (blocks.length < 3) return;
    if (card.dataset.noCollapse === 'true') return;

    var firstBlock = blocks[0];
    var wrapper = document.createElement('div');
    wrapper.className = 'collapsible-section collapsed';

    for (var i = 1; i < blocks.length; i++) {
      wrapper.appendChild(blocks[i]);
    }
    card.appendChild(wrapper);

    // 预览信息（chapter-preview）保持可见，不折叠

    var btn = document.createElement('button');
    btn.className = 'toggle-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', '展开完整精读内容');
    btn.innerHTML = '<span>展开完整精读</span> <span class="arrow">▾</span>';

    var hint = document.createElement('div');
    hint.className = 'preview-hint';
    hint.textContent = '点击展开：包含核心概念解读、文化背景、反方观点、中国市场关联、术语词典、思考题';

    card.appendChild(hint);
    card.appendChild(btn);

    // 恢复持久化的展开状态
    var chapterId = card.id || '';
    var storageKey = 'book_expanded_' + chapterId;
    try {
      if (localStorage.getItem(storageKey) === 'true') {
        expandSection(wrapper, btn, hint, storageKey);
      }
    } catch(e) {
      // localStorage 不可用时静默降级（Safari隐私模式等）
    }

    btn.addEventListener('click', function() {
      var isCollapsed = wrapper.classList.contains('collapsed');
      if (isCollapsed) {
        expandSection(wrapper, btn, hint, storageKey);
      } else {
        collapseSection(wrapper, btn, hint, storageKey);
      }
    });
  });

  function expandSection(wrapper, btn, hint, storageKey) {
    wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
    wrapper.classList.remove('collapsed');
    wrapper.classList.add('expanded');
    btn.classList.add('expanded');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', '收起完整精读内容');
    btn.innerHTML = '<span>收起完整精读</span> <span class="arrow">▾</span>';
    if (hint) hint.style.display = 'none';
    // 动画结束后移除max-height限制，避免内容被截断
    setTimeout(function() { wrapper.style.maxHeight = 'none'; }, 500);
    persistState(storageKey, 'true');
  }

  function collapseSection(wrapper, btn, hint, storageKey) {
    wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
    // Force reflow
    wrapper.offsetHeight;
    wrapper.style.maxHeight = '0px';
    wrapper.classList.add('collapsed');
    wrapper.classList.remove('expanded');
    btn.classList.remove('expanded');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', '展开完整精读内容');
    btn.innerHTML = '<span>展开完整精读</span> <span class="arrow">▾</span>';
    if (hint) hint.style.display = 'block';
    persistState(storageKey, 'false');
  }

  function persistState(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch(e) {
      // QuotaExceededError 或其他存储异常：静默降级
      console.warn('localStorage 不可用，展开状态不会持久化');
    }
  }

  // ==================== 导航栏：章节下拉菜单 + 当前章节显示 ====================
  var chapterNavLinks = document.querySelectorAll('.top-nav .nav-links a[href^="#ch"]');
  if (chapterNavLinks.length > 0) {
    // 创建下拉触发按钮
    var trigger = document.createElement('button');
    trigger.className = 'nav-chapter-trigger';
    trigger.innerHTML = '<span class="current-label">章节导航</span> <span class="arrow">▾</span>';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');

    // 创建下拉面板
    var dropdown = document.createElement('div');
    dropdown.className = 'nav-chapter-dropdown';
    dropdown.setAttribute('role', 'menu');

    // 创建分隔线
    var sep = document.createElement('span');
    sep.className = 'nav-sep';

    // 把所有章节链接（href以#ch开头）移入下拉面板
    chapterNavLinks.forEach(function(a) {
      // 标记为章节导航链接
      a.classList.add('ch-nav');
      var clone = a.cloneNode(true);
      clone.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          var top = target.getBoundingClientRect().top + window.pageYOffset - 60;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
        dropdown.classList.remove('open');
        trigger.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      });
      dropdown.appendChild(clone);
    });

    // 插入到导航栏中：在第一个ch-nav链接之前
    var firstChLink = document.querySelector('.top-nav .nav-links a[href^="#ch"]');
    if (firstChLink) {
      firstChLink.parentNode.insertBefore(sep, firstChLink);
      firstChLink.parentNode.insertBefore(trigger, sep);
      trigger.appendChild(dropdown);
    }

    // 点击触发按钮切换下拉
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.contains('open');
      dropdown.classList.toggle('open', !isOpen);
      trigger.classList.toggle('open', !isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });

    // 点击页面其他地方关闭
    document.addEventListener('click', function(e) {
      if (!trigger.contains(e.target)) {
        dropdown.classList.remove('open');
        trigger.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ==================== 侧边导航面板（TOC） ====================
  var tocTrigger = document.createElement('button');
  tocTrigger.className = 'toc-trigger';
  tocTrigger.setAttribute('aria-label', '打开章节导航');
  tocTrigger.setAttribute('title', '章节导航');
  tocTrigger.innerHTML = '📑';
  document.body.appendChild(tocTrigger);

  var tocOverlay = document.createElement('div');
  tocOverlay.className = 'toc-overlay';
  document.body.appendChild(tocOverlay);

  var tocPanel = document.createElement('div');
  tocPanel.className = 'toc-panel';
  tocPanel.setAttribute('aria-label', '章节导航面板');
  tocPanel.setAttribute('role', 'dialog');
  tocPanel.setAttribute('aria-modal', 'true');

  var panelHeader = document.createElement('div');
  panelHeader.className = 'toc-panel-header';
  panelHeader.innerHTML = '<h3>📑 章节导航</h3>';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'toc-panel-close';
  closeBtn.setAttribute('aria-label', '关闭导航');
  closeBtn.innerHTML = '✕';
  panelHeader.appendChild(closeBtn);
  tocPanel.appendChild(panelHeader);

  var panelList = document.createElement('div');
  panelList.className = 'toc-panel-list';
  document.querySelectorAll('.top-nav .nav-links a').forEach(function(a) {
    var clone = a.cloneNode(true);
    clone.addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        var top = target.getBoundingClientRect().top + window.pageYOffset - 60;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
      closePanel();
    });
    panelList.appendChild(clone);
  });
  tocPanel.appendChild(panelList);
  document.body.appendChild(tocPanel);

  function openPanel() {
    tocPanel.classList.add('open');
    tocOverlay.classList.add('open');
    tocTrigger.style.display = 'none';
    document.body.style.overflow = 'hidden';
  }
  function closePanel() {
    tocPanel.classList.remove('open');
    tocOverlay.classList.remove('open');
    tocTrigger.style.display = '';
    document.body.style.overflow = '';
  }

  tocTrigger.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  tocOverlay.addEventListener('click', closePanel);

  // ESC 关闭
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && tocPanel.classList.contains('open')) {
      closePanel();
    }
  });

  // 滚动时显示/隐藏触发按钮
  var tocTriggerTimer;
  window.addEventListener('scroll', function() {
    clearTimeout(tocTriggerTimer);
    tocTriggerTimer = setTimeout(function() {
      tocTrigger.classList.toggle('visible', window.scrollY > 600);
    }, 150);
  }, { passive: true });

  // 同步章节高亮到面板链接
  function syncPanelHighlight(id) {
    panelList.querySelectorAll('a').forEach(function(a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  }

  // ==================== 导航平滑滚动 ====================
  function addSmoothScroll(links) {
    links.forEach(function(a) {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          var top = target.getBoundingClientRect().top + window.pageYOffset - 60;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });
  }
  addSmoothScroll(document.querySelectorAll('.top-nav .nav-links a'));

  // ==================== IntersectionObserver：导航高亮 + 进度条 + 锚点分享 ====================
  var navLinks = document.querySelectorAll('.top-nav .nav-links a');
  var progressFill = document.querySelector('.progress-bar .fill');
  var progressText = document.querySelector('.progress-text');
  var allChapters = Array.from(document.querySelectorAll('[id]')).filter(function(el) {
    return el.id.startsWith('ch') || el.id === 'intro';
  });
  var totalChapters = allChapters.length;

  // 处理URL锚点跳转
  if (window.location.hash) {
    var hashTarget = document.querySelector(window.location.hash);
    if (hashTarget) {
      setTimeout(function() {
        var top = hashTarget.getBoundingClientRect().top + window.pageYOffset - 60;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }, 300);
    }
  }

  // 监听浏览器前进/后退
  window.addEventListener('popstate', function() {
    if (window.location.hash) {
      var target = document.querySelector(window.location.hash);
      if (target) {
        var top = target.getBoundingClientRect().top + window.pageYOffset - 60;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }
  });

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        navLinks.forEach(function(a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
        // 同步到下拉面板
        if (typeof dropdown !== 'undefined' && dropdown) {
          dropdown.querySelectorAll('a').forEach(function(a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + id);
          });
        }
        // 同步到侧边面板
        syncPanelHighlight(id);
        // 更新下拉触发按钮标签
        if (typeof trigger !== 'undefined' && trigger) {
          var activeA = dropdown.querySelector('a.active');
          if (activeA) {
            trigger.querySelector('.current-label').textContent = activeA.textContent;
          }
        }
        if (id && window.location.hash !== '#' + id) {
          history.replaceState(null, '', '#' + id);
        }
        // 更新进度条
        var idx = allChapters.indexOf(entry.target);
        if (idx >= 0 && progressFill && progressText) {
          var pct = Math.round((idx + 1) / totalChapters * 100);
          progressFill.style.width = pct + '%';
          progressText.textContent = '已读 ' + (idx + 1) + '/' + totalChapters + ' 章';
        }

        // 前情提要：当进入第N章（N>1），显示前面章节的一句话总结
        if (id && id.indexOf('ch') === 0 && entry.target.classList.contains('chapter-card')) {
          showRecap(entry.target, id);
        }
      }
    });
  }, { rootMargin: '-60px 0px -60% 0px' });

  // 只观察章节卡片和导言，不观察所有带 id 的元素
  document.querySelectorAll('.chapter-card[id], #intro').forEach(function(el) {
    observer.observe(el);
  });

  // 进度条除零保护
  if (totalChapters === 0) totalChapters = 1;

  // ==================== 前情提要 ====================
  var recapInserted = {};

  function showRecap(currentCard, currentId) {
    // 只对章节卡片（#chN）生效，且每个章节只插入一次
    if (recapInserted[currentId]) return;

    // 收集当前章节之前所有章节的 takeaway
    var allCards = document.querySelectorAll('.chapter-card');
    var takeaways = [];
    var foundCurrent = false;

    allCards.forEach(function(card) {
      if (card.id === currentId) {
        foundCurrent = true;
        return; // 不包含当前章节本身
      }
      if (foundCurrent) return; // 跳过当前之后的章节

      // 只收集有 id 的章节卡片
      if (!card.id || card.id.indexOf('ch') !== 0) return;

      var titleEl = card.querySelector('.ch-title');
      var title = titleEl ? titleEl.textContent.trim() : (card.id);
      var items = card.querySelectorAll('.takeaway-list li');
      items.forEach(function(li) {
        takeaways.push({ chapter: title, text: li.textContent.trim() });
      });
    });

    if (takeaways.length === 0) return;

    recapInserted[currentId] = true;

    // 创建前情提要卡片
    var recap = document.createElement('div');
    recap.className = 'recap-card';
    recap.setAttribute('aria-label', '前情提要');

    var html = '<div class="recap-header">📌 前情提要 — 已读章节的核心结论</div>';
    html += '<ul class="recap-list">';
    takeaways.forEach(function(t) {
      var shortText = t.text.length > 80 ? t.text.slice(0, 80) + '…' : t.text;
      html += '<li><span class="recap-chapter">' + t.chapter + '</span> ' + shortText + '</li>';
    });
    html += '</ul>';

    recap.innerHTML = html;

    // 插入到章节卡片的 ch-header 之后
    var header = currentCard.querySelector('.ch-header');
    if (header) {
      header.parentNode.insertBefore(recap, header.nextSibling);
    }
  }

  // 前情提要 CSS 注入（仅注入一次）
  if (!document.getElementById('recap-style')) {
    var recapStyle = document.createElement('style');
    recapStyle.id = 'recap-style';
    recapStyle.textContent =
      '.recap-card {' +
        'background:#f8f6f0;border:1px solid #e8e5df;border-radius:10px;' +
        'padding:16px 20px;margin:12px 0 16px;font-size:13px;' +
      '}' +
      '.recap-card .recap-header {' +
        'font-weight:700;color:#8a7a6a;margin-bottom:8px;font-size:12px;' +
        'letter-spacing:0.5px;' +
      '}' +
      '.recap-card .recap-list {list-style:none;margin:0;padding:0;}' +
      '.recap-card .recap-list li {' +
        'padding:6px 0;border-bottom:1px solid #e8e5df;line-height:1.6;color:#5c4a2a;' +
      '}' +
      '.recap-card .recap-list li:last-child {border-bottom:none;}' +
      '.recap-card .recap-chapter {' +
        'display:inline-block;background:#e0d8c8;color:#5c4a2a;' +
        'font-size:11px;font-weight:600;padding:1px 8px;border-radius:8px;margin-right:6px;' +
        'white-space:nowrap;' +
      '}' +
      '@media (max-width:768px) {' +
        '.recap-card {padding:12px 14px;font-size:12px;}' +
        '.recap-card .recap-chapter {font-size:10px;}' +
      '}';
    document.head.appendChild(recapStyle);
  }

  // ==================== 回到顶部按钮 ====================
  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    backToTop.setAttribute('aria-label', '回到顶部');
    backToTop.setAttribute('tabindex', '0');
    backToTop.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    var btObserver = new IntersectionObserver(function(entries) {
      backToTop.classList.toggle('visible', !entries[0].isIntersecting);
    }, { threshold: 0 });
    btObserver.observe(document.querySelector('.book-hero'));
  }

  // ==================== Android Chrome 地址栏 resize debounce ====================
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      // 地址栏变化不触发任何scroll逻辑，仅在此处消费事件
    }, 250);
  }, { passive: true });

  // ==================== 键盘导航支持 ====================
  document.querySelectorAll('.chat-widget .chat-header').forEach(function(header) {
    header.setAttribute('tabindex', '0');
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', 'false');
    header.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        header.click();
      }
    });
  });

  // 导航链接 tabindex
  document.querySelectorAll('.top-nav .nav-links a').forEach(function(a) {
    a.setAttribute('tabindex', '0');
  });

  // ==================== 章节轻量自测卡片（思考题下方的折叠式引导） ====================
  var QUIZ_COLLAPSED_LABEL = '<span style="font-size:16px;">💡</span> 这道思考题，你的答案是什么？点此看看大师怎么说';
  var QUIZ_EXPANDED_LABEL = '<span style="font-size:16px;">💡</span> <span style="color:#7b4fbf;">已展开 · 点击收起</span>';

  document.querySelectorAll('.chapter-card .exercise-box').forEach(function(box) {
    var quiz = document.createElement('div');
    quiz.className = 'self-quiz';
    quiz.style.cssText = 'margin-top:12px;margin-bottom:16px;background:#f8f4fd;border:1px solid #e8ddf5;border-radius:8px;padding:12px 16px;cursor:pointer;transition:background 0.2s;';
    quiz.setAttribute('role', 'button');
    quiz.setAttribute('tabindex', '0');
    quiz.setAttribute('aria-expanded', 'false');
    quiz.setAttribute('aria-label', '展开自测引导');

    var quizHeader = document.createElement('div');
    quizHeader.style.cssText = 'font-size:13px;color:#8a8a8a;display:flex;align-items:center;gap:6px;user-select:none;';
    quizHeader.innerHTML = QUIZ_COLLAPSED_LABEL;

    var quizBody = document.createElement('div');
    quizBody.style.cssText = 'display:none;margin-top:10px;padding-top:10px;border-top:1px solid #e8ddf5;font-size:13px;color:var(--text);line-height:1.8;cursor:auto;';
    quizBody.innerHTML =
      '<p style="color:#7b4fbf;font-weight:600;margin-bottom:6px;">💬 大师视角参考</p>' +
      '<p style="margin-bottom:6px;">每位投资大师都会告诉你：<strong>投资中最危险的不是犯错，而是不思考</strong>。这道思考题没有标准答案，但有一个思考方向——不把问题当作"二选一"，而是问自己：<strong>在什么条件下选A，在什么条件下选B？</strong></p>' +
      '<p style="font-size:12px;color:var(--text-secondary);">如果你已经有了自己的答案，恭喜——你正在建造自己的投资体系。如果还没有，也没关系，<strong>把问题存在脑子里，下次看盘的时候想想它</strong>。</p>';

    quiz.appendChild(quizHeader);
    quiz.appendChild(quizBody);

    function toggleQuiz() {
      var isHidden = quizBody.style.display === 'none';
      quizBody.style.display = isHidden ? 'block' : 'none';
      quizHeader.innerHTML = isHidden ? QUIZ_EXPANDED_LABEL : QUIZ_COLLAPSED_LABEL;
      quiz.setAttribute('aria-expanded', String(isHidden));
      quiz.setAttribute('aria-label', isHidden ? '收起自测引导' : '展开自测引导');
    }

    quiz.addEventListener('click', toggleQuiz);
    quiz.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleQuiz();
      }
    });

    box.parentNode.insertBefore(quiz, box.nextSibling);
  });

})();

/**
 * 阅读进度追踪模块
 * 仅在书籍页（/books/{slug}/）生效。
 * localStorage 键：reading_progress（按书 slug namespace，避免旧键 book_expanded_* 的跨书污染问题）
 * 结构：{ slug: { lastVisit: ISO时间戳, visits: 次数, chaptersRead: [已展开章节id] } }
 */
(function() {
  'use strict';

  var match = window.location.pathname.match(/\/books\/([^\/]+)\//);
  if (!match) return;
  var slug = match[1];
  var STORAGE_KEY = 'reading_progress';
  var storageOK = true;

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : {};
      return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    } catch (e) {
      storageOK = false;
      return {};
    }
  }

  function saveProgress(data) {
    if (!storageOK) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // 隐私模式 / QuotaExceeded：静默降级
      storageOK = false;
    }
  }

  var progress = loadProgress();
  if (!storageOK) return;

  var entry = progress[slug];
  if (!entry || typeof entry !== 'object') {
    entry = { lastVisit: '', visits: 0, chaptersRead: [] };
  }
  if (!Array.isArray(entry.chaptersRead)) entry.chaptersRead = [];

  // 本次访问：visits +1，更新 lastVisit
  entry.visits = (parseInt(entry.visits, 10) || 0) + 1;
  entry.lastVisit = new Date().toISOString();
  progress[slug] = entry;
  saveProgress(progress);

  function markChapterRead(chapterId) {
    if (!chapterId || !/^ch\d+$/.test(chapterId)) return;
    if (entry.chaptersRead.indexOf(chapterId) !== -1) return;
    entry.chaptersRead.push(chapterId);
    progress[slug] = entry;
    saveProgress(progress);
  }

  // 页面加载时：折叠模块已恢复的展开章节也计入
  document.querySelectorAll('.chapter-card').forEach(function(card) {
    var btn = card.querySelector('.toggle-btn');
    if (btn && btn.getAttribute('aria-expanded') === 'true' && card.id) {
      markChapterRead(card.id);
    }
  });

  // 事件委托监听 .toggle-btn 点击（折叠模块的处理器先执行，冒泡到此处时 aria-expanded 已更新）
  document.addEventListener('click', function(e) {
    var target = e.target;
    var btn = (target && target.closest) ? target.closest('.toggle-btn') : null;
    if (!btn) return;
    if (btn.getAttribute('aria-expanded') === 'true') {
      var card = btn.closest('.chapter-card');
      if (card && card.id) markChapterRead(card.id);
    }
  });
})();

/**
 * 收藏原则模块
 * 在书籍页每条 .takeaway-list li 后注入 ☆/★ 收藏按钮。
 * localStorage 键：my_principles（JSON 数组）
 * 每条：{ text, book, bookSlug, chapter, timestamp }，按 text + bookSlug 去重
 */
(function() {
  'use strict';

  var match = window.location.pathname.match(/\/books\/([^\/]+)\//);
  if (!match) return;
  var slug = match[1];
  var STORAGE_KEY = 'my_principles';
  var storageOK = true;

  function loadPrinciples() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      storageOK = false;
      return [];
    }
  }

  function savePrinciples(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      return true;
    } catch (e) {
      return false;
    }
  }

  loadPrinciples();
  if (!storageOK) return; // localStorage 不可用：不注入按钮，静默降级

  // 书名：优先取 book-hero 标题，去掉书名号
  var bookName = '';
  var heroTitle = document.querySelector('.book-hero .info h1');
  if (heroTitle) bookName = heroTitle.textContent.replace(/[《》]/g, '').trim();
  if (!bookName) bookName = (document.title.split(/[—-]/)[0] || '').trim();

  function findIndex(arr, text) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && arr[i].text === text && arr[i].bookSlug === slug) return i;
    }
    return -1;
  }

  document.querySelectorAll('.takeaway-list li').forEach(function(li) {
    var text = li.textContent.trim();
    if (!text) return;

    // 所在章节标题
    var chapter = '';
    var card = li.closest ? li.closest('.chapter-card') : null;
    if (card) {
      var titleEl = card.querySelector('.ch-title');
      chapter = titleEl ? titleEl.textContent.trim() : (card.id || '');
    }

    var saved = findIndex(loadPrinciples(), text) !== -1;
    var btn = document.createElement('button');
    btn.className = 'principle-star';
    btn.style.cssText = 'display:inline;background:none;border:none;padding:0 4px;margin-left:6px;font-size:14px;color:var(--gold);cursor:pointer;vertical-align:baseline;line-height:1;font-family:inherit;';
    btn.textContent = saved ? '★' : '☆';
    btn.setAttribute('aria-pressed', String(saved));
    btn.setAttribute('title', saved ? '取消收藏' : '收藏到我的投资体系');
    btn.setAttribute('aria-label', saved ? '取消收藏该原则' : '收藏该原则到我的投资体系');

    btn.addEventListener('click', function() {
      var principles = loadPrinciples();
      var idx = findIndex(principles, text);
      var nowSaved;
      if (idx !== -1) {
        principles.splice(idx, 1);
        nowSaved = false;
      } else {
        principles.push({
          text: text,
          book: bookName,
          bookSlug: slug,
          chapter: chapter,
          timestamp: new Date().toISOString()
        });
        nowSaved = true;
      }
      if (!savePrinciples(principles)) return; // 写入失败保持原状
      btn.textContent = nowSaved ? '★' : '☆';
      btn.setAttribute('aria-pressed', String(nowSaved));
      btn.setAttribute('title', nowSaved ? '取消收藏' : '收藏到我的投资体系');
      btn.setAttribute('aria-label', nowSaved ? '取消收藏该原则' : '收藏该原则到我的投资体系');
    });

    li.appendChild(btn);
  });

  // ==================== 自动打卡（有交互后才触发） ====================
  var streakMarked = false;
  function tryMarkStreak() {
    if (streakMarked) return;
    if (typeof AppData !== 'undefined' && AppData.markToday) {
      AppData.markToday();
      streakMarked = true;
    }
  }
  // 用户滚动超过 300px 或展开任意章节时打卡
  var streakScrollHandler = function() {
    if (window.scrollY > 300) {
      tryMarkStreak();
      window.removeEventListener('scroll', streakScrollHandler);
    }
  };
  window.addEventListener('scroll', streakScrollHandler, { passive: true });
  // 展开章节也触发打卡
  document.addEventListener('click', function(e) {
    if (e.target.closest('.toggle-btn')) {
      tryMarkStreak();
    }
  });
})();

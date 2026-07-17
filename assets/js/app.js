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
      }
    });
  }, { rootMargin: '-60px 0px -60% 0px' });

  document.querySelectorAll('[id]').forEach(function(el) {
    observer.observe(el);
  });

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

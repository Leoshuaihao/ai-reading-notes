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
    var storageKey = 'book_fisher_expanded_' + chapterId;
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
    hint.style.display = 'none';
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
    hint.style.display = 'block';
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

  // ==================== 浮动TOC ====================
  var toc = document.createElement('div');
  toc.className = 'toc-float';
  toc.setAttribute('aria-label', '快速导航');
  toc.innerHTML = '<strong style="font-size:12px;color:var(--accent);padding:6px 12px;display:block;">📑 快速导航</strong>';
  document.querySelectorAll('.top-nav .nav-links a').forEach(function(a) {
    var clone = a.cloneNode(true);
    toc.appendChild(clone);
  });
  document.body.appendChild(toc);

  // TOC 链接平滑滚动
  addSmoothScroll(document.querySelectorAll('.toc-float a'));

  var tocTimer;
  window.addEventListener('scroll', function() {
    clearTimeout(tocTimer);
    tocTimer = setTimeout(function() {
      toc.classList.toggle('visible', window.scrollY > 600);
    }, 100);
  }, { passive: true });

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
  var tocLinks = document.querySelectorAll('.toc-float a');
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
        tocLinks.forEach(function(a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
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
  document.querySelectorAll('.top-nav .nav-links a, .toc-float a').forEach(function(a) {
    a.setAttribute('tabindex', '0');
  });

})();

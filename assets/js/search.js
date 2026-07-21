/**
 * AI精读笔记 — 全局内容搜索（MiniSearch 客户端）
 *
 * 依赖：MiniSearch CDN（minisearch@7.0.0）
 *       assets/js/search_index.json（搜索索引）
 *
 * 使用：
 *   - 点击导航栏 🔍 按钮 → openSearch()
 *   - 快捷键 Ctrl/Cmd+K → openSearch()
 *   - 输入关键词 → 实时搜索（200ms debounce）
 */
(function() {
  'use strict';

  var _index = null;
  var _miniSearch = null;
  var _loaded = false;
  var _loading = false;
  var _debounceTimer = null;

  // ==================== DOM：搜索 Modal ====================

  var modalHTML = [
    '<div id="search-modal" class="search-modal" aria-hidden="true">',
    '  <div class="search-backdrop" onclick="closeSearch()"></div>',
    '  <div class="search-dialog">',
    '    <div class="search-header">',
    '      <span class="search-icon">🔍</span>',
    '      <input type="text" id="search-input" class="search-input"',
    '        placeholder="搜索章节内容、概念、金句…" autocomplete="off" autofocus>',
    '      <button class="search-close" onclick="closeSearch()" aria-label="关闭">&times;</button>',
    '    </div>',
    '    <div class="search-hint" id="search-hint">',
    '      输入关键词搜索 500+ 章节 · 支持模糊匹配',
    '    </div>',
    '    <div class="search-results" id="search-results"></div>',
    '    <div class="search-footer">',
    '      <span>↑↓ 导航</span><span>Enter 打开</span><span>Esc 关闭</span>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('\n');

  var styleHTML = [
    '<style>',
    /* Modal */
    '.search-modal { display:none; position:fixed; inset:0; z-index:10001; }',
    '.search-modal.open { display:block; }',
    '.search-backdrop { position:absolute; inset:0; background:rgba(0,0,0,0.4); }',
    '.search-dialog {',
    '  position:absolute; top:15%; left:50%; transform:translateX(-50%);',
    '  width:90%; max-width:600px; max-height:70vh;',
    '  background:var(--card,#fff); border-radius:16px;',
    '  box-shadow:0 20px 60px rgba(0,0,0,0.25);',
    '  display:flex; flex-direction:column; overflow:hidden;',
    '}',
    /* Header */
    '.search-header {',
    '  display:flex; align-items:center; gap:10px;',
    '  padding:16px 20px; border-bottom:1px solid var(--border,#eee);',
    '}',
    '.search-icon { font-size:18px; flex-shrink:0; }',
    '.search-input {',
    '  flex:1; border:none; outline:none; font-size:16px;',
    '  background:transparent; color:var(--text,#333);',
    '  font-family: system-ui, sans-serif;',
    '}',
    '.search-input::placeholder { color:var(--text-secondary,#999); }',
    '.search-close {',
    '  background:none; border:none; font-size:24px; cursor:pointer;',
    '  color:var(--text-secondary,#999); padding:0 4px; line-height:1;',
    '}',
    '.search-close:hover { color:var(--text,#333); }',
    /* Hint */
    '.search-hint {',
    '  padding:20px; text-align:center;',
    '  color:var(--text-secondary,#999); font-size:14px;',
    '}',
    /* Results */
    '.search-results {',
    '  flex:1; overflow-y:auto; padding:8px 0;',
    '  min-height:60px; max-height:50vh;',
    '}',
    '.search-result-item {',
    '  display:block; padding:12px 20px; text-decoration:none;',
    '  color:var(--text,#333); border-bottom:1px solid var(--border,#f0f0f0);',
    '  transition:background 0.15s; cursor:pointer;',
    '}',
    '.search-result-item:hover,',
    '.search-result-item.active { background:var(--tag-bg,#f5f5f5); }',
    '.search-result-book {',
    '  font-size:12px; color:var(--text-secondary,#999); margin-bottom:4px;',
    '}',
    '.search-result-title {',
    '  font-size:15px; font-weight:700; margin-bottom:4px; line-height:1.4;',
    '}',
    '.search-result-preview {',
    '  font-size:13px; color:var(--text-secondary,#666);',
    '  line-height:1.6; overflow:hidden;',
    '  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;',
    '}',
    '.search-result-preview mark {',
    '  background:#fdf0e8; color:var(--accent,#c75b39); padding:1px 3px;',
    '  border-radius:2px;',
    '}',
    '.search-result-domain {',
    '  font-size:11px; color:var(--accent,#c75b39);',
    '  background:var(--accent-light,#fdf0e8);',
    '  padding:1px 8px; border-radius:8px; margin-left:8px;',
    '}',
    '.search-empty {',
    '  padding:32px 20px; text-align:center;',
    '  color:var(--text-secondary,#999); font-size:14px;',
    '}',
    '.search-loading {',
    '  padding:32px 20px; text-align:center;',
    '  color:var(--text-secondary,#999); font-size:14px;',
    '}',
    /* Footer */
    '.search-footer {',
    '  display:flex; gap:20px; justify-content:center;',
    '  padding:10px 20px; border-top:1px solid var(--border,#eee);',
    '  font-size:11px; color:var(--text-secondary,#bbb);',
    '}',
    /* Nav button */
    '.nav-search-btn {',
    '  background:none; border:none; font-size:18px; cursor:pointer;',
    '  padding:4px 8px; border-radius:6px; transition:background 0.2s;',
    '  color:var(--text,#333);',
    '}',
    '.nav-search-btn:hover { background:var(--tag-bg,#f0f0f0); }',
    '@media (max-width:768px) {',
    '  .search-dialog { top:5%; max-height:85vh; }',
    '}',
    '</style>'
  ].join('\n');

  // 注入 DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.head.insertAdjacentHTML('beforeend', styleHTML);

  // ==================== 加载索引 ====================

  function loadIndex(cb) {
    if (_loaded) { cb(); return; }
    if (_loading) {
      // 等待加载完成
      var check = setInterval(function() {
        if (_loaded) { clearInterval(check); cb(); }
      }, 100);
      return;
    }
    _loading = true;

    fetch('assets/js/search_index.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        _index = data;
        if (typeof MiniSearch !== 'undefined') {
          _miniSearch = new MiniSearch({
            fields: ['book', 'author', 'chapterTitle', 'preview', 'keyConcepts', 'takeaways'],
            storeFields: ['book', 'bookSlug', 'author', 'chapterTitle', 'url', 'domain', 'chapter'],
            searchOptions: {
              boost: { chapterTitle: 3, keyConcepts: 2, takeaways: 1.5 },
              prefix: true,
              fuzzy: 0.2
            }
          });
          _miniSearch.addAll(data);
        }
        _loaded = true;
        _loading = false;
        cb();
      })
      .catch(function() {
        _loading = false;
        cb();
      });
  }

  // ==================== 搜索逻辑 ====================

  function doSearch(query) {
    var resultsEl = document.getElementById('search-results');
    var hintEl = document.getElementById('search-hint');

    if (!query || query.trim().length === 0) {
      resultsEl.innerHTML = '';
      hintEl.style.display = '';
      return;
    }

    if (!_loaded) {
      resultsEl.innerHTML = '<div class="search-loading">⏳ 加载索引中…</div>';
      return;
    }

    if (!_miniSearch) {
      resultsEl.innerHTML = '<div class="search-empty">搜索引擎未就绪，请刷新页面重试</div>';
      return;
    }

    hintEl.style.display = 'none';
    var results = _miniSearch.search(query, { prefix: true, fuzzy: 0.2 });

    // 追踪搜索事件
    if (typeof window.analytics !== 'undefined') {
      window.analytics.track('search_performed', { query: query, results_count: results.length });
    }

    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="search-empty">未找到与「' + query + '」相关的章节</div>';
      return;
    }

    // 最多显示 20 条
    var maxResults = Math.min(results.length, 20);
    var html = '';
    for (var i = 0; i < maxResults; i++) {
      var r = results[i];
      var preview = (r.preview || '').substring(0, 150);
      // 关键词高亮
      var terms = [];
      if (r.terms) { terms = r.terms; }
      else { terms = query.split(/\s+/).filter(function(t) { return t.length > 0; }); }
      for (var t = 0; t < terms.length; t++) {
        var term = terms[t];
        var regex = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        preview = preview.replace(regex, '<mark>$1</mark>');
      }

      html += '<a class="search-result-item" href="' + r.url + '" onclick="closeSearch()">' +
        '<div class="search-result-book">📚 ' + r.book + ' · 第' + r.chapter + '章' +
        (r.domain ? '<span class="search-result-domain">' + r.domain + '</span>' : '') +
        '</div>' +
        '<div class="search-result-title">' + r.chapterTitle + '</div>' +
        '<div class="search-result-preview">' + preview + '</div>' +
        '</a>';
    }

    if (results.length > maxResults) {
      html += '<div class="search-empty">还有 ' + (results.length - maxResults) + ' 条结果，请细化搜索词</div>';
    }

    resultsEl.innerHTML = html;
  }

  // ==================== 搜索 Modal 控制 ====================

  window.openSearch = function() {
    var modal = document.getElementById('search-modal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    var input = document.getElementById('search-input');
    if (input) {
      input.value = '';
      setTimeout(function() { input.focus(); }, 100);
    }

    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-hint').style.display = '';

    // 加载索引
    loadIndex(function() {});
  };

  window.closeSearch = function() {
    var modal = document.getElementById('search-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  // ==================== 事件绑定 ====================

  // 输入搜索（debounce 200ms）
  document.addEventListener('input', function(e) {
    if (e.target.id !== 'search-input') return;
    var query = e.target.value;
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function() {
      doSearch(query);
    }, 200);
  });

  // 键盘：Esc 关闭
  document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd+K 打开搜索
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
      return;
    }
    // Esc 关闭
    if (e.key === 'Escape') {
      var modal = document.getElementById('search-modal');
      if (modal && modal.classList.contains('open')) {
        closeSearch();
      }
      return;
    }
    // Enter 打开第一个结果
    if (e.key === 'Enter') {
      var modal = document.getElementById('search-modal');
      if (modal && modal.classList.contains('open')) {
        var active = document.querySelector('.search-result-item.active');
        if (active) {
          closeSearch();
          window.location.href = active.getAttribute('href');
        } else {
          var first = document.querySelector('.search-result-item');
          if (first) {
            closeSearch();
            window.location.href = first.getAttribute('href');
          }
        }
      }
    }
    // 上下键导航
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var modal = document.getElementById('search-modal');
      if (!modal || !modal.classList.contains('open')) return;
      e.preventDefault();
      var items = document.querySelectorAll('.search-result-item');
      if (items.length === 0) return;
      var activeIdx = -1;
      for (var i = 0; i < items.length; i++) {
        if (items[i].classList.contains('active')) { activeIdx = i; break; }
      }
      if (e.key === 'ArrowDown') activeIdx = (activeIdx + 1) % items.length;
      else activeIdx = activeIdx <= 0 ? items.length - 1 : activeIdx - 1;
      items.forEach(function(item) { item.classList.remove('active'); });
      items[activeIdx].classList.add('active');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
    }
  });

  // 点击背景关闭
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('search-backdrop')) {
      closeSearch();
    }
  });

})();

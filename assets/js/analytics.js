/**
 * AI精读笔记 — 用户行为分析 SDK V2
 *
 * 策略：
 *   - 批量发送（3 秒 / 10 条），sendBeacon 保底
 *   - 同类型事件 1 秒内 rate limit
 *   - 匿名 ID 持久化到 localStorage
 *   - 章节阅读通过 IntersectionObserver（50% 可见触发）
 *
 * 使用：
 *   window.analytics.track('event_name', { key: 'value' })
 */
(function() {
  'use strict';

  var ENDPOINT = 'https://zvacgujeywaytpkixdtw.supabase.co';
  var ANON_KEY = 'sb_publishable_FPRCtR8-8kzKjANW86sq1Q_iw5J8rCk';
  var QUEUE = [];
  var FLUSH_INTERVAL = 3000;
  var MAX_BATCH = 10;
  var RATE_LIMIT_MS = 1000;
  var _lastEvent = {};

  // ==================== 匿名 ID ====================

  function getAnonymousId() {
    var id = localStorage.getItem('_aid');
    if (!id) {
      id = 'anon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('_aid', id);
    }
    return id;
  }

  // ==================== 发送 ====================

  function flush() {
    if (QUEUE.length === 0) return;
    var batch = QUEUE.splice(0, MAX_BATCH);
    fetch(ENDPOINT + '/rest/v1/analytics_events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(batch)
    }).catch(function() {});
  }

  // ==================== 追踪 ====================

  function track(eventName, properties) {
    // 频率限制
    var now = Date.now();
    if (_lastEvent[eventName] && now - _lastEvent[eventName] < RATE_LIMIT_MS) return;
    _lastEvent[eventName] = now;

    QUEUE.push({
      event_name: eventName,
      anonymous_id: getAnonymousId(),
      timestamp: new Date().toISOString(),
      page_url: window.location.pathname,
      user_agent: navigator.userAgent,
      properties: properties || {}
    });
    if (QUEUE.length >= MAX_BATCH) flush();
  }

  setInterval(flush, FLUSH_INTERVAL);

  // beforeunload → sendBeacon
  window.addEventListener('beforeunload', function() {
    if (QUEUE.length === 0) return;
    try {
      navigator.sendBeacon(
        ENDPOINT + '/rest/v1/analytics_events',
        new Blob([JSON.stringify(QUEUE)], { type: 'application/json' })
      );
    } catch(e) {}
    QUEUE = [];
  });

  // ==================== 自动追踪 ====================

  // page_view
  track('page_view', {
    referrer: document.referrer || 'direct',
    screen_width: window.innerWidth
  });

  // 章节阅读：IntersectionObserver（50% 可见触发一次）
  var _chapterObserved = {};
  function observeChapters() {
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting && !_chapterObserved[e.target.id]) {
          _chapterObserved[e.target.id] = true;
          var book = e.target.getAttribute('data-book');
          var ch = e.target.getAttribute('data-chapter');
          var title = e.target.getAttribute('data-title');
          if (book && ch) {
            track('chapter_unfold', {
              book_slug: book,
              chapter_num: parseInt(ch),
              book_title: title || book
            });
          }
        }
      });
    }, { threshold: 0.5 });

    setTimeout(function() {
      document.querySelectorAll('.chapter-card[data-book]').forEach(function(el) {
        obs.observe(el);
      });
      // fallback：没有 data-book 的 chapter-card 从 URL 推断
      document.querySelectorAll('.chapter-card:not([data-book])').forEach(function(el) {
        var path = window.location.pathname;
        var m = path.match(/books\/([^/]+)/);
        if (m) {
          el.setAttribute('data-book', m[1]);
          el.setAttribute('data-chapter', el.getAttribute('data-chapter') || '1');
          obs.observe(el);
        }
      });
    }, 500);
  }

  // ==================== 引导漏斗（P1-2.1 调用）====================
  // 5 步漏斗：step_1_visit → step_2_test_start → step_3_test_complete
  //           → step_4_book_open → step_5_chapter_read
  // 由 onboarding.js（M2 交付）在各步骤调用：
  //   window.analytics.track('onboarding_funnel', { step: 'step_2_test_start' });
  // SDK 已就位，事件会自动写入 analytics_events 表。

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeChapters);
  } else {
    observeChapters();
  }

  // ==================== 导出 ====================

  window.analytics = { track: track };
})();

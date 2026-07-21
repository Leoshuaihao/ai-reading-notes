/**
 * AI精读笔记 — 用户行为分析 SDK
 *
 * 策略：
 *   - 批量发送（3 秒 / 10 条），减少请求数
 *   - beforeunload 用 sendBeacon 确保不丢数据
 *   - 所有网络错误静默忽略，不影响用户交互
 *   - 匿名用户也能追踪（user_id 为空），登录后自动补上
 *
 * 使用：
 *   window.analytics.track('event_name', { key: 'value' })
 *   各页面引入此 JS 后自动记录 page_view
 */
(function() {
  'use strict';

  var ENDPOINT = 'https://zvacgujeywaytpkixdtw.supabase.co';
  var ANON_KEY = 'sb_publishable_FPRCtR8-8kzKjANW86sq1Q_iw5J8rCk';
  var QUEUE = [];
  var FLUSH_INTERVAL = 3000;
  var MAX_BATCH = 10;

  // ==================== 用户 ID ====================

  function getUserId() {
    try {
      if (typeof SupabaseAuth !== 'undefined') {
        var user = SupabaseAuth.getUser();
        if (user && user.id) return user.id;
      }
    } catch(e) {}
    return null;
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
    }).catch(function() { /* 静默失败 */ });
  }

  // ==================== 追踪 ====================

  function track(event, properties) {
    QUEUE.push({
      user_id: getUserId(),
      event: event,
      properties: properties || {},
      page: window.location.pathname,
      created_at: new Date().toISOString()
    });
    if (QUEUE.length >= MAX_BATCH) flush();
  }

  // 定时发送
  setInterval(flush, FLUSH_INTERVAL);

  // 页面卸载时强制 flush（sendBeacon 不丢数据）
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

  // ==================== 自动 page_view ====================

  track('page_view', {
    referrer: document.referrer || 'direct',
    screen_width: window.innerWidth
  });

  // ==================== 导出 ====================

  window.analytics = { track: track };
})();

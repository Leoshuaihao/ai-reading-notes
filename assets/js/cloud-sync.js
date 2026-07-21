/**
 * AI精读笔记 — 云同步 Write-Through Cache
 *
 * 依赖：supabase-client.js（提供 SupabaseAuth）、supabase-auth.js（提供认证事件）
 *
 * 策略：
 *   写 → localStorage 立即写（秒开） + 异步推 Supabase（fire-and-forget）
 *   读 → localStorage 优先 → 登录后 Supabase 后拉 → 仅填充本地缺失的 key
 *   冲突 → 本地优先（localStorage 最新写入者赢）
 *
 * 使用：
 *   data_v2.js 的 safeSet() 自动调用 window.triggerCloudSync(key, value)
 *   页面引入此 JS 后自动生效，无需额外初始化
 */
(function() {
  'use strict';

  var _pulling = false;

  /**
   * 推送单个 key-value 到 Supabase（fire-and-forget）
   * 由 data_v2.js 的 safeSet 调用
   */
  function pushToCloud(key, value) {
    // 防回环：拉取云端数据时不触发再次推送
    if (_pulling) return;

    // 依赖检查
    if (typeof SupabaseAuth === 'undefined') return;

    var user = SupabaseAuth.getUser();
    if (!user) return;                  // 未登录不推送

    var client = SupabaseAuth.getClient();
    if (!client) return;

    client.from('user_data')
      .upsert({
        user_id: user.id,
        key: key,
        value: value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,key' })
      .then(function() { /* silent success */ })
      .catch(function() { /* fire-and-forget — 网络失败不影响用户体验 */ });
  }

  /**
   * 登录后拉取云端数据，仅填充本地缺失的 key
   * 本地已有的数据保留（本地优先策略）
   */
  function pullFromCloud() {
    if (typeof SupabaseAuth === 'undefined') return;

    var user = SupabaseAuth.getUser();
    if (!user) return;

    var client = SupabaseAuth.getClient();
    if (!client) return;

    _pulling = true;

    client.from('user_data')
      .select('key, value, updated_at')
      .eq('user_id', user.id)
      .then(function(res) {
        if (res.error || !res.data || !res.data.length) {
          _pulling = false;
          return;
        }

        res.data.forEach(function(row) {
          var local = localStorage.getItem(row.key);
          if (local) {
            // 本地有数据 → 保留本地，不做覆盖
            return;
          }

          // 本地没有 → 从云端恢复
          try {
            var v = row.value;
            if (typeof v === 'string') v = JSON.parse(v);
            localStorage.setItem(row.key, JSON.stringify(v));
          } catch (e) {
            // 格式异常，跳过
          }
        });

        _pulling = false;
      })
      .catch(function() {
        _pulling = false;
      });
  }

  // ==================== 初始化 ====================

  // 监听登录事件 → 拉取云端数据
  document.addEventListener('supabase-auth-change', function(e) {
    if (e.detail && e.detail.user) {
      pullFromCloud();
    }
  });

  // 页面加载时如果已登录 → 拉取云端数据
  if (typeof SupabaseAuth !== 'undefined') {
    var existingUser = SupabaseAuth.getUser();
    if (existingUser) {
      // 延迟执行，等页面渲染完
      setTimeout(pullFromCloud, 500);
    }
  }

  // ==================== 导出 ====================

  // 供 data_v2.js safeSet 调用的全局入口
  window.triggerCloudSync = pushToCloud;
})();

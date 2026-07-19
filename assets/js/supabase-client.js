/**
 * AI精读笔记 — Supabase 客户端
 * 配置后启用云同步和会员功能
 */
(function() {
  'use strict';

  // ==================== 配置 ====================
  // 从 Supabase Dashboard > Settings > API 获取
  var SUPABASE_URL = 'https://zvacgujeywaytpkixdtw.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_FPRCtR8-8kzKjANW86sq1Q_iw5J8rCk';

  // 如果未配置，禁用云功能
  var ENABLED = SUPABASE_URL.indexOf('YOUR_PROJECT') === -1;

  if (!ENABLED) {
    console.log('[Supabase] 未配置，云同步暂不可用');
    window.__SUPABASE_ENABLED__ = false;
    return;
  }

  // ==================== 初始化 ====================
  var supabase = null;

  function getClient() {
    if (!supabase && window.supabase) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return supabase;
  }

  // 等待 CDN 加载
  function waitForSDK(cb) {
    if (window.supabase) { cb(); return; }
    var check = setInterval(function() {
      if (window.supabase) { clearInterval(check); cb(); }
    }, 100);
  }

  // ==================== Auth ====================
  var currentUser = null;

  function getUser() { return currentUser; }

  function onAuthChange(user) {
    currentUser = user;
    if (user) {
      window.__SUPABASE_ENABLED__ = true;
      document.documentElement.classList.add('logged-in');
    } else {
      window.__SUPABASE_ENABLED__ = false;
      document.documentElement.classList.remove('logged-in');
    }
    // 触发自定义事件
    var event = new CustomEvent('supabase-auth-change', { detail: { user: user } });
    document.dispatchEvent(event);
  }

  function initAuth() {
    waitForSDK(function() {
      var client = getClient();
      if (!client) return;

      // 监听 auth 状态变化
      client.auth.onAuthStateChange(function(event, session) {
        onAuthChange(session ? session.user : null);
      });

      // 检查当前登录状态
      client.auth.getSession().then(function(_ref) {
        var data = _ref.data, error = _ref.error;
        if (data && data.session) {
          onAuthChange(data.session.user);
        }
      });
    });
  }

  // ==================== 登录/注册 ====================
  function signUp(email, password) {
    return getClient().auth.signUp({ email: email, password: password });
  }

  function signIn(email, password) {
    return getClient().auth.signInWithPassword({ email: email, password: password });
  }

  function signOut() {
    return getClient().auth.signOut().then(function() {
      onAuthChange(null);
      localStorage.removeItem('supabase_session');
    });
  }

  function resetPassword(email) {
    return getClient().auth.resetPasswordForEmail(email);
  }

  // ==================== 数据同步 ====================
  var SYNC_KEYS = [
    'reading_progress',
    'my_principles',
    'investment_journal',
    'reading_notes',
    'chapter_read_times',
    'reading_streak',
    'ability_profile'
  ];

  // 上传本地数据到 Supabase
  function uploadData() {
    if (!currentUser) return Promise.resolve();
    var client = getClient();
    if (!client) return Promise.resolve();

    var promises = SYNC_KEYS.map(function(key) {
      var local = localStorage.getItem(key);
      if (!local) return Promise.resolve();

      var value;
      try { value = JSON.parse(local); } catch(e) { value = local; }

      return client
        .from('user_data')
        .upsert({
          user_id: currentUser.id,
          key: key,
          value: value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,key' });
    });

    return Promise.all(promises);
  }

  // 下载云端数据合并到 localStorage
  function downloadData() {
    if (!currentUser) return Promise.resolve();
    var client = getClient();
    if (!client) return Promise.resolve();

    return client
      .from('user_data')
      .select('key, value')
      .eq('user_id', currentUser.id)
      .then(function(_ref2) {
        var data = _ref2.data, error = _ref2.error;
        if (error || !data) return;

        data.forEach(function(row) {
          var local = localStorage.getItem(row.key);
          var localObj = null;
          try { localObj = local ? JSON.parse(local) : null; } catch(e) {}

          var remoteValue = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;

          // 合并策略：云端时间更新的优先
          // 简单策略：云端覆盖本地（首次同步时用）
          if (!localObj) {
            localStorage.setItem(row.key, JSON.stringify(remoteValue));
            return;
          }

          // 数组类型（journal, principles）：合并去重
          if (Array.isArray(remoteValue) && Array.isArray(localObj)) {
            var merged = remoteValue.concat(localObj);
            // 简单去重（基于内容长度）
            var seen = new Set();
            merged = merged.filter(function(item) {
              var key = JSON.stringify(item).substring(0, 50);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            localStorage.setItem(row.key, JSON.stringify(merged));
          } else {
            // 其他类型：云端优先
            localStorage.setItem(row.key, JSON.stringify(remoteValue));
          }
        });
      });
  }

  // 完整同步流程
  function fullSync() {
    return uploadData().then(downloadData);
  }

  // ==================== 导出 ====================
  window.__SUPABASE_ENABLED__ = ENABLED;
  window.SupabaseAuth = {
    init: initAuth,
    getUser: getUser,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    resetPassword: resetPassword,
    uploadData: uploadData,
    downloadData: downloadData,
    fullSync: fullSync,
    getClient: getClient,
  };

  // 启动 auth 监听
  initAuth();
})();

/**
 * AI精读笔记 — 本地注册/登录（内测版）
 * 纯 localStorage，无外部依赖，不收费
 * 密码用 SHA-256 哈希存储
 */
(function() {
  'use strict';

  var USERS_KEY = 'local_users';
  var CURRENT_KEY = 'current_user';

  // ==================== 密码哈希 ====================

  /** SHA-256 哈希 → hex 字符串 */
  async function hashPassword(password) {
    var encoder = new TextEncoder();
    var data = encoder.encode(password);
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return 'sha256:' + hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  /** 验证密码：哈希比对 + 旧明文用户自动迁移 */
  async function verifyPassword(stored, input) {
    // 新格式：sha256:xxx
    if (stored && stored.startsWith('sha256:')) {
      var hashed = await hashPassword(input);
      return hashed === stored;
    }
    // 旧明文格式：比对后自动升级
    if (stored === input) {
      return true;
    }
    return false;
  }

  // ==================== 用户读写 ====================

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch(e) { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(CURRENT_KEY)); } catch(e) { return null; }
  }

  function setCurrentUser(email) {
    var u = { id: email, email: email };
    localStorage.setItem(CURRENT_KEY, JSON.stringify(u));
    document.documentElement.classList.add('logged-in');
    return u;
  }

  // ==================== 认证 API ====================

  async function signUp(email, password) {
    var users = getUsers();
    if (users[email]) {
      return { error: { message: '该邮箱已注册，请直接登录' } };
    }
    var hashed = await hashPassword(password);
    users[email] = { password: hashed, created_at: new Date().toISOString() };
    saveUsers(users);
    var user = setCurrentUser(email);

    // 同步推进旧明文格式迁移（后台清理）
    migrateOldPasswords(users);

    return { data: { user: user, session: { user: user } }, error: null };
  }

  async function signIn(email, password) {
    var users = getUsers();
    if (!users[email]) {
      return { error: { message: '邮箱未注册，请先注册' } };
    }
    var valid = await verifyPassword(users[email].password, password);
    if (!valid) {
      return { error: { message: '密码错误' } };
    }
    // 旧明文密码自动升级为哈希
    if (!users[email].password.startsWith('sha256:')) {
      users[email].password = await hashPassword(password);
      saveUsers(users);
    }
    var user = setCurrentUser(email);
    return { data: { user: user, session: { user: user } }, error: null };
  }

  function signOut() {
    localStorage.removeItem(CURRENT_KEY);
    document.documentElement.classList.remove('logged-in');
    return Promise.resolve();
  }

  function getUser() { return getCurrentUser(); }

  /** 密码重置：验证邮箱 → 输入新密码 */
  async function resetPassword(email) {
    var users = getUsers();
    if (!users[email]) {
      return { error: { message: '该邮箱未注册' } };
    }
    // 本地模式下弹窗让用户输入新密码
    var newPassword = prompt('请输入新密码（至少6位）：');
    if (!newPassword || newPassword.length < 6) {
      return { error: { message: '密码至少需要6位' } };
    }
    var confirmPassword = prompt('请再次输入新密码：');
    if (newPassword !== confirmPassword) {
      return { error: { message: '两次输入的密码不一致' } };
    }
    users[email].password = await hashPassword(newPassword);
    users[email].password_updated_at = new Date().toISOString();
    saveUsers(users);
    return { data: {}, error: null };
  }

  /** 后台迁移旧明文密码 */
  async function migrateOldPasswords(users) {
    var needsSave = false;
    var entries = Object.entries(users);
    for (var i = 0; i < entries.length; i++) {
      var pw = entries[i][1].password;
      if (pw && !pw.startsWith('sha256:')) {
        entries[i][1].password = await hashPassword(pw);
        needsSave = true;
      }
    }
    if (needsSave) saveUsers(users);
  }

  // ==================== 兼容 SupabaseAuth API ====================

  window.SupabaseAuth = {
    init: function() {},
    getUser: getUser,
    signUp: function(email, password) { return signUp(email, password); },
    signIn: function(email, password) { return signIn(email, password); },
    signOut: signOut,
    resetPassword: function(email) { return resetPassword(email); },
    uploadData: function() { return Promise.resolve(); },
    downloadData: function() { return Promise.resolve(); },
    fullSync: function() { return Promise.resolve(); },
    getClient: function() { return null; },
  };

  // ==================== 启动 ====================

  var currentUser = getCurrentUser();
  if (currentUser) {
    document.documentElement.classList.add('logged-in');
  }
  setTimeout(function() {
    document.dispatchEvent(new CustomEvent('supabase-auth-change', { detail: { user: currentUser } }));
  }, 10);
})();

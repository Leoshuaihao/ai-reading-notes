/**
 * AI精读笔记 — 本地注册/登录（内测版）
 * 纯 localStorage，无外部依赖，不收费
 * 后期可无缝切换为 Supabase 云同步
 */
(function() {
  'use strict';

  var USERS_KEY = 'local_users';
  var CURRENT_KEY = 'current_user';

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

  function signUp(email, password) {
    var users = getUsers();
    if (users[email]) {
      return Promise.resolve({ error: { message: '该邮箱已注册，请直接登录' } });
    }
    users[email] = { password: password, created_at: new Date().toISOString() };
    saveUsers(users);
    var user = setCurrentUser(email);
    return Promise.resolve({ data: { user: user, session: { user: user } }, error: null });
  }

  function signIn(email, password) {
    var users = getUsers();
    if (!users[email]) {
      return Promise.resolve({ error: { message: '邮箱未注册，请先注册' } });
    }
    if (users[email].password !== password) {
      return Promise.resolve({ error: { message: '密码错误' } });
    }
    var user = setCurrentUser(email);
    return Promise.resolve({ data: { user: user, session: { user: user } }, error: null });
  }

  function signOut() {
    localStorage.removeItem(CURRENT_KEY);
    document.documentElement.classList.remove('logged-in');
    return Promise.resolve();
  }

  function getUser() { return getCurrentUser(); }

  // 兼容 SupabaseAuth API
  window.SupabaseAuth = {
    init: function() {},
    getUser: getUser,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    resetPassword: function() { return Promise.resolve({ error: null }); },
    uploadData: function() { return Promise.resolve(); },
    downloadData: function() { return Promise.resolve(); },
    fullSync: function() { return Promise.resolve(); },
    getClient: function() { return null; },
  };

  // 触发 auth-change 事件（supabase-auth-ui 依赖之一）
  var currentUser = getCurrentUser();
  if (currentUser) {
    document.documentElement.classList.add('logged-in');
  }
  setTimeout(function() {
    document.dispatchEvent(new CustomEvent('supabase-auth-change', { detail: { user: currentUser } }));
  }, 10);
})();

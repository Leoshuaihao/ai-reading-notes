/**
 * AI精读笔记 — 登录/注册模态框
 * 轻量级，无依赖，嵌入所有页面
 */
(function() {
  'use strict';

  // ==================== DOM 创建 ====================
  var modalHTML = [
    '<div id="auth-modal" class="auth-modal" aria-hidden="true">',
    '  <div class="auth-backdrop" onclick="closeAuth()"></div>',
    '  <div class="auth-card">',
    '    <button class="auth-close" onclick="closeAuth()" aria-label="关闭">&times;</button>',
    '    <div class="auth-tabs">',
    '      <button class="auth-tab active" data-tab="login">登录</button>',
    '      <button class="auth-tab" data-tab="signup">注册</button>',
    '    </div>',

    // 登录表单
    '    <form id="login-form" class="auth-form active" onsubmit="return handleLogin(event)">',
    '      <label>邮箱</label>',
    '      <input type="email" id="login-email" placeholder="your@email.com" required autocomplete="email"/>',
    '      <label>密码</label>',
    '      <input type="password" id="login-password" placeholder="至少6位" required minlength="6" autocomplete="current-password"/>',
    '      <p class="auth-error" id="login-error"></p>',
    '      <button type="submit" class="auth-submit">登录</button>',
    '      <p class="auth-switch"><a href="#" onclick="forgotPassword()">忘记密码？</a></p>',
    '    </form>',

    // 注册表单
    '    <form id="signup-form" class="auth-form" onsubmit="return handleSignup(event)">',
    '      <label>邮箱</label>',
    '      <input type="email" id="signup-email" placeholder="your@email.com" required autocomplete="email"/>',
    '      <label>密码</label>',
    '      <input type="password" id="signup-password" placeholder="至少6位" required minlength="6" autocomplete="new-password"/>',
    '      <p class="auth-error" id="signup-error"></p>',
    '      <button type="submit" class="auth-submit">注册</button>',
    '      <p class="auth-info">注册即表示同意服务条款和隐私政策</p>',
    '    </form>',

    // 成功提示
    '    <div id="auth-success" class="auth-form" style="text-align:center;padding:20px 0;">',
    '      <div style="font-size:48px;margin-bottom:16px;">&#9993;</div>',
    '      <p style="font-size:16px;font-weight:600;">验证邮件已发送</p>',
    '      <p style="color:var(--text-secondary);">请查看邮箱并点击确认链接</p>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('\n');

  var styleHTML = [
    '<style>',
    '.auth-modal { display:none; position:fixed; inset:0; z-index:10000; }',
    '.auth-modal.open { display:block; }',
    '.auth-backdrop { position:absolute; inset:0; background:rgba(0,0,0,0.5); }',
    '.auth-card { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);',
    '  background:var(--card,#fff); border-radius:16px; padding:32px 28px; width:90%; max-width:400px;',
    '  max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.3); }',
    '.auth-close { position:absolute; top:12px; right:16px; background:none; border:none;',
    '  font-size:24px; cursor:pointer; color:var(--text-secondary,#999); }',
    '.auth-tabs { display:flex; gap:0; margin-bottom:24px; border-bottom:2px solid var(--border,#eee); }',
    '.auth-tab { flex:1; padding:10px; border:none; background:none; font-size:15px;',
    '  font-weight:600; cursor:pointer; color:var(--text-secondary,#999);',
    '  border-bottom:2px solid transparent; margin-bottom:-2px; transition:all 0.2s; }',
    '.auth-tab.active { color:var(--accent,#c75b39); border-bottom-color:var(--accent,#c75b39); }',
    '.auth-form { display:none; }',
    '.auth-form.active { display:block; }',
    '.auth-form label { display:block; font-size:13px; font-weight:600; margin-bottom:6px;',
    '  color:var(--text,#333); }',
    '.auth-form input { width:100%; padding:10px 12px; border:1.5px solid var(--border,#ddd);',
    '  border-radius:8px; font-size:15px; margin-bottom:16px; background:var(--bg,#fafafa);',
    '  color:var(--text,#333); transition:border-color 0.2s; }',
    '.auth-form input:focus { outline:none; border-color:var(--accent,#c75b39); }',
    '.auth-submit { width:100%; padding:12px; background:var(--accent,#c75b39); color:#fff;',
    '  border:none; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer;',
    '  transition:opacity 0.2s; margin-top:8px; }',
    '.auth-submit:hover { opacity:0.9; }',
    '.auth-error { color:#e04040; font-size:13px; margin:-8px 0 12px; display:none; }',
    '.auth-error.show { display:block; }',
    '.auth-info { font-size:12px; color:var(--text-secondary,#999); text-align:center; margin-top:12px; }',
    '.auth-switch { text-align:center; margin-top:12px; font-size:13px; }',
    '.auth-switch a { color:var(--accent,#c75b39); }',

    // 用户按钮样式
    '.user-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 14px;',
    '  border:1.5px solid var(--border,#ddd); border-radius:20px; font-size:13px;',
    '  cursor:pointer; background:var(--bg,#fafafa); color:var(--text,#333);',
    '  transition:all 0.2s; }',
    '.user-btn:hover { border-color:var(--accent,#c75b39); }',
    '.user-menu { display:none; position:absolute; top:100%; right:0; margin-top:8px;',
    '  background:var(--card,#fff); border:1px solid var(--border,#ddd); border-radius:12px;',
    '  box-shadow:0 8px 24px rgba(0,0,0,0.12); min-width:180px; padding:8px 0; z-index:1000; }',
    '.user-menu.open { display:block; }',
    '.user-menu-item { display:block; width:100%; padding:10px 20px; border:none;',
    '  background:none; font-size:14px; text-align:left; cursor:pointer;',
    '  color:var(--text,#333); transition:background 0.15s; }',
    '.user-menu-item:hover { background:var(--bg,#f5f5f5); }',
    '.user-menu-divider { height:1px; background:var(--border,#eee); margin:4px 0; }',
    '.premium-badge { font-size:10px; padding:2px 6px; border-radius:8px;',
    '  background:#fdf0e8; color:#c75b39; font-weight:600; }',
    '</style>'
  ].join('\n');

  // 注入 DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.head.insertAdjacentHTML('beforeend', styleHTML);

  // ==================== 事件处理 ====================
  var currentMode = 'login';

  // 标签切换
  document.querySelectorAll('.auth-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var mode = tab.dataset.tab;
      currentMode = mode;
      document.getElementById('login-form').classList.toggle('active', mode === 'login');
      document.getElementById('signup-form').classList.toggle('active', mode === 'signup');
      document.getElementById('auth-success').classList.remove('active');
      clearErrors();
    });
  });

  function clearErrors() {
    ['login-error', 'signup-error'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.textContent = ''; el.classList.remove('show'); }
    });
  }

  function showError(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('show'); }
  }

  window.openAuth = function(mode) {
    mode = mode || 'login';
    var modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    if (mode === 'signup') {
      document.querySelector('[data-tab="signup"]').click();
    }
  };

  window.closeAuth = function() {
    var modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    clearErrors();
  };

  window.handleLogin = function(e) {
    e.preventDefault();
    clearErrors();
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;

    if (!email || !password) {
      showError('login-error', '请填写邮箱和密码');
      return false;
    }

    var btn = e.target.querySelector('.auth-submit');
    btn.disabled = true;
    btn.textContent = '登录中...';

    window.SupabaseAuth.signIn(email, password).then(function(_ref) {
      var error = _ref.error;
      if (error) {
        showError('login-error', error.message || '登录失败');
        btn.disabled = false;
        btn.textContent = '登录';
        return;
      }
      closeAuth();
      window.SupabaseAuth.fullSync().then(function() {
        location.reload();
      });
    });

    return false;
  };

  window.handleSignup = function(e) {
    e.preventDefault();
    clearErrors();
    var email = document.getElementById('signup-email').value.trim();
    var password = document.getElementById('signup-password').value;

    if (!email || !password) {
      showError('signup-error', '请填写邮箱和密码');
      return false;
    }
    if (password.length < 6) {
      showError('signup-error', '密码至少6位');
      return false;
    }

    var btn = e.target.querySelector('.auth-submit');
    btn.disabled = true;
    btn.textContent = '注册中...';

    window.SupabaseAuth.signUp(email, password).then(function(_ref) {
      var data = _ref.data, error = _ref.error;
      if (error) {
        showError('signup-error', error.message || '注册失败');
        btn.disabled = false;
        btn.textContent = '注册';
        return;
      }
      // 邮箱确认关闭时直接登录，否则显示验证提示
      if (data.session) {
        closeAuth();
        window.SupabaseAuth.fullSync().then(function() {
          location.reload();
        });
      } else {
        document.getElementById('login-form').classList.remove('active');
        document.getElementById('signup-form').classList.remove('active');
        document.getElementById('auth-success').classList.add('active');
      }
    });

    return false;
  };

  window.forgotPassword = function() {
    var email = prompt('请输入注册邮箱，我们将发送重置链接：');
    if (!email) return;
    window.SupabaseAuth.resetPassword(email).then(function(_ref) {
      var error = _ref.error;
      if (error) {
        alert('发送失败：' + error.message);
      } else {
        alert('重置链接已发送到 ' + email + '，请查看邮箱');
      }
    });
  };

  window.handleSignOut = function() {
    if (confirm('确定退出登录吗？')) {
      window.SupabaseAuth.signOut().then(function() {
        location.reload();
      });
    }
  };

  // ==================== 用户按钮（导航栏） ====================
  function addUserButton() {
    var nav = document.querySelector('nav.top-nav, .top-nav, header nav, .header-nav');
    if (!nav) {
      // 尝试在任意导航栏找位置
      var candidates = document.querySelectorAll('nav, header, .shelf-header, .top-bar');
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].classList.contains('top-nav') ||
            candidates[i].querySelector('a[href="index.html"]') ||
            candidates[i].querySelector('a[href="bookshelf.html"]')) {
          nav = candidates[i];
          break;
        }
      }
    }
    // 终极兜底：append 到第一个可见 header 或 body
    if (!nav) {
      nav = document.querySelector('header') || document.querySelector('.my-hero') || document.body;
    }

    // 检查是否已添加
    if (document.getElementById('user-btn-container')) return;

    var container = document.createElement('div');
    container.id = 'user-btn-container';
    container.style.cssText = 'position:relative;margin-left:auto;';

    var btn = document.createElement('button');
    btn.className = 'user-btn';
    btn.id = 'user-btn';
    btn.innerHTML = '&#128100; 登录';
    btn.title = '登录 / 注册';

    var menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.id = 'user-menu';

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var user = window.SupabaseAuth.getUser();
      if (user) {
        menu.classList.toggle('open');
      } else {
        openAuth('login');
      }
    });

    document.addEventListener('click', function() {
      menu.classList.remove('open');
    });

    container.appendChild(btn);
    container.appendChild(menu);

    // 插入到导航栏末尾
    nav.appendChild(container);

    // 监听 auth 状态变化更新 UI
    updateUserUI();
    document.addEventListener('supabase-auth-change', updateUserUI);
  }

  function updateUserUI() {
    var btn = document.getElementById('user-btn');
    var menu = document.getElementById('user-menu');
    if (!btn || !menu) return;

    var user = window.SupabaseAuth.getUser();
    if (user) {
      var email = user.email || '';
      var display = email.split('@')[0] || '用户';
      btn.innerHTML = '<span style="margin-right:4px;">&#128100;</span>' + display;
      btn.title = email;

      menu.innerHTML = [
        '<div class="user-menu-item" style="cursor:default;color:var(--text-secondary);">',
        '  ' + email + '',
        '</div>',
        '<div class="user-menu-item" onclick="location.href=\'my.html\'">',
        '  &#128214; 我的修行',
        '</div>',
        '<div class="user-menu-divider"></div>',
        '<div class="user-menu-item" style="color:#e04040;" onclick="handleSignOut()">',
        '  退出登录',
        '</div>'
      ].join('');
    } else {
      btn.innerHTML = '&#128100; 登录';
      btn.title = '登录 / 注册';
      menu.innerHTML = '';
    }
  }

  // 页面加载完才添加按钮
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addUserButton);
  } else {
    addUserButton();
  }

})();

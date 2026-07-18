/**
 * AI精读笔记 — 共享数据层
 * 
 * 所有页面的统一数据源。添加新书时只需修改本文件中的 BOOK_META 和 DOMAINS。
 * 
 * 使用方式：
 *   <script src="../../assets/js/data.js"></script>
 *   <script>
 *     var meta = AppData.getBook('fisher');
 *     var progress = AppData.getProgress();
 *     AppData.markChapterRead('fisher', 3);
 *   </script>
 */
var AppData = (function() {
  'use strict';

  // ==================== 静态数据 ====================

  /** 书籍元数据库（唯一数据源） */
  var BOOK_META = {
    'fisher':               { title: '怎样选择成长股',     chapters: 8,  school: 'growth',      schoolName: '成长' },
    'howard-marks':         { title: '投资最重要的事',     chapters: 21, school: 'cycle',       schoolName: '周期' },
    'buffett':              { title: '巴菲特之道',         chapters: 8,  school: 'value',       schoolName: '价值' },
    'market-cycle':         { title: '周期',               chapters: 18, school: 'cycle',       schoolName: '周期' },
    'buffett-letters':      { title: '巴菲特致股东的信',   chapters: 12, school: 'value',       schoolName: '价值' },
    'alchemy-finance':      { title: '金融炼金术',         chapters: 12, school: 'cycle',       schoolName: '周期' },
    'poor-charlie':         { title: '穷查理宝典',         chapters: 12, school: 'mind',        schoolName: '心理' },
    'intelligent-investor': { title: '聪明的投资者',       chapters: 20, school: 'value',       schoolName: '价值' },
    'peter-lynch':          { title: '彼得·林奇的成功投资', chapters: 20, school: 'growth',      schoolName: '成长' },
    'security-analysis':    { title: '证券分析',           chapters: 18, school: 'value',       schoolName: '价值' },
    'beating-street':       { title: '战胜华尔街',         chapters: 13, school: 'growth',      schoolName: '成长' },
    'stock-operator':       { title: '股票大作手回忆录',   chapters: 24, school: 'mind',        schoolName: '心理' },
    'economic-moat':        { title: '巴菲特的护城河',     chapters: 14, school: 'value',       schoolName: '价值' },
    'fooled-by-randomness': { title: '随机漫步的傻瓜',     chapters: 14, school: 'uncertainty', schoolName: '不确定' },
    'black-swan':           { title: '黑天鹅',             chapters: 19, school: 'uncertainty', schoolName: '不确定' },
    'antifragile':          { title: '反脆弱',             chapters: 24, school: 'uncertainty', schoolName: '不确定' }
  };

  /** 五域修行体系 */
  var DOMAINS = [
    {
      key: 'business', emoji: '🧭', name: '商业认知', question: '能不能识别好生意？',
      description: '理解企业的商业模式、竞争优势和护城河——这是投资的地基。林奇教我们从身边发现好公司，费雪教我们深度调研，多尔西教我们识别护城河。',
      master: '彼得·林奇', masterInitial: '林', color: '#2d7d46',
      books: [
        { slug: 'peter-lynch', lv: 1 },
        { slug: 'beating-street', lv: 1 },
        { slug: 'fisher', lv: 2 },
        { slug: 'economic-moat', lv: 2 }
      ],
      cross: [
        { slug: 'intelligent-investor', ch: 20, label: '第20章「安全边际」' },
        { slug: 'howard-marks', ch: 12, label: '第12章「寻找便宜货」' }
      ]
    },
    {
      key: 'valuation', emoji: '⚖️', name: '资产估值', question: '这家公司值多少钱？',
      description: '格雷厄姆开创的「安全边际」原则是价值投资的基石。学会用数字说话——内在价值、DCF、PE/PB，把模糊的直觉转化为可量化的判断。',
      master: '本杰明·格雷厄姆', masterInitial: '格', color: '#2c6faa',
      books: [
        { slug: 'buffett', lv: 1 },
        { slug: 'intelligent-investor', lv: 2 },
        { slug: 'security-analysis', lv: 3 },
        { slug: 'buffett-letters', lv: 3 }
      ],
      cross: [
        { slug: 'poor-charlie', ch: 2, label: '第2章「投资原则检查清单」' },
        { slug: 'fisher', ch: 3, label: '第3章「15条原则」' }
      ]
    },
    {
      key: 'cycle', emoji: '🔄', name: '周期与市场', question: '市场现在处于什么位置？',
      description: '霍华德·马克斯的钟摆理论告诉我们：市场在恐惧与贪婪之间永恒摇摆。学会读懂周期信号——信贷、情绪、估值——你就能在极端时刻做出逆向决策。',
      master: '霍华德·马克斯', masterInitial: '马', color: '#c75b39',
      books: [
        { slug: 'howard-marks', lv: 2 },
        { slug: 'market-cycle', lv: 3 },
        { slug: 'alchemy-finance', lv: 3 }
      ],
      cross: [
        { slug: 'antifragile', ch: 11, label: '第11章「杠铃策略」' },
        { slug: 'stock-operator', ch: 23, label: '第23章「市场永远不会错」' }
      ]
    },
    {
      key: 'mind', emoji: '🧘', name: '心性与哲学', question: '我怎么不被情绪干掉？',
      description: '芒格的多元思维模型提醒我们：投资最大的敌人是镜子里的那个人。认知偏差、从众心理、损失厌恶——这些心理陷阱每年让投资者付出惨痛代价。这一域帮你建立投资纪律。',
      master: '查理·芒格', masterInitial: '芒', color: '#7b4fbf',
      books: [
        { slug: 'stock-operator', lv: 1 },
        { slug: 'poor-charlie', lv: 2 }
      ],
      cross: [
        { slug: 'intelligent-investor', ch: 8, label: '第8章「市场先生」' },
        { slug: 'howard-marks', ch: 9, label: '第9章「钟摆意识」' },
        { slug: 'buffett-letters', ch: 6, label: '第6章「市场先生与波动」' }
      ]
    },
    {
      key: 'uncertainty', emoji: '🌪️', name: '不确定性与风险', question: '我不知道的事如何伤害我？',
      description: '塔勒布的「黑天鹅」系列重塑了我们对风险的理解。真正危险的不是已知风险，而是你不知道你不知道的东西。学会构建反脆弱组合，从波动中获益而非受害。',
      master: '纳西姆·塔勒布', masterInitial: '塔', color: '#b8860b',
      books: [
        { slug: 'black-swan', lv: 3 },
        { slug: 'fooled-by-randomness', lv: 3 },
        { slug: 'antifragile', lv: 4 }
      ],
      cross: [
        { slug: 'market-cycle', ch: 8, label: '第8章「风险态度周期」' },
        { slug: 'security-analysis', ch: 1, label: '导言「安全边际」' }
      ]
    }
  ];

  /** 等级体系 */
  var LEVELS = [
    { level: 1, name: '见习学徒', xpNeeded: 0,   emoji: '🌱' },
    { level: 2, name: '初级行者', xpNeeded: 10,  emoji: '🥾' },
    { level: 3, name: '中级行者', xpNeeded: 30,  emoji: '🧗' },
    { level: 4, name: '高阶行者', xpNeeded: 60,  emoji: '🏔️' },
    { level: 5, name: '见习智者', xpNeeded: 100, emoji: '🔮' },
    { level: 6, name: '贤者',     xpNeeded: 160, emoji: '🧙' },
    { level: 7, name: '大贤者',   xpNeeded: 240, emoji: '👑' },
    { level: 8, name: '宗师',     xpNeeded: 340, emoji: '💎' },
    { level: 9, name: '传奇宗师', xpNeeded: 460, emoji: '⭐' }
  ];

  /** 难度色标 */
  var LV_COLOR = { 1: '#4caf50', 2: '#2196F3', 3: '#FF9800', 4: '#e74c3c' };
  var LV_EMOJI = { 1: '🌱', 2: '🌿', 3: '🍂', 4: '🌋' };

  // ==================== localStorage 键名 ====================
  var KEY_PROGRESS = 'reading_progress';
  var KEY_PRINCIPLES = 'my_principles';
  var KEY_STREAK = 'reading_streak';

  // ==================== 工具函数 ====================
  function safeJSON(str, fallback) {
    try { return JSON.parse(str) || fallback; } catch (e) { return fallback; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  // ==================== 进度读写 ====================

  /** 获取全部阅读进度 */
  function getProgress() {
    return safeJSON(localStorage.getItem(KEY_PROGRESS), {});
  }

  /** 获取某本书的进度 */
  function getBookProgress(slug) {
    var meta = BOOK_META[slug];
    var total = meta ? meta.chapters : 0;
    var p = getProgress()[slug];
    var read = 0;
    if (p && p.chaptersRead && p.chaptersRead.length) {
      var seen = {};
      p.chaptersRead.forEach(function(c) { seen[c] = true; });
      read = Math.min(Object.keys(seen).length, total);
    }
    return { read: read, total: total, pct: total ? Math.round(read / total * 100) : 0 };
  }

  /** 标记某章已读 */
  function markChapterRead(slug, chapterNum) {
    var progress = getProgress();
    if (!progress[slug]) progress[slug] = { chaptersRead: [] };
    if (progress[slug].chaptersRead.indexOf(chapterNum) === -1) {
      progress[slug].chaptersRead.push(chapterNum);
      safeSet(KEY_PROGRESS, progress);
    }
  }

  /** 获取某域的进度 */
  function getDomainProgress(domainKey) {
    var domain = null;
    DOMAINS.forEach(function(d) { if (d.key === domainKey) domain = d; });
    if (!domain) return { read: 0, total: 0, pct: 0, started: false, completedBooks: 0 };
    var read = 0, total = 0, completedBooks = 0;
    domain.books.forEach(function(b) {
      var bp = getBookProgress(b.slug);
      read += bp.read;
      total += bp.total;
      if (bp.total > 0 && bp.read >= bp.total) completedBooks++;
    });
    return {
      read: read, total: total,
      pct: total ? Math.round(read / total * 100) : 0,
      started: read > 0,
      completedBooks: completedBooks
    };
  }

  // ==================== 原则收藏 ====================
  function getPrinciples() {
    return safeJSON(localStorage.getItem(KEY_PRINCIPLES), []);
  }

  function addPrinciple(principle) {
    var principles = getPrinciples();
    // 去重
    if (principles.some(function(p) { return p.text === principle.text; })) return false;
    principles.push(principle);
    safeSet(KEY_PRINCIPLES, principles);
    return true;
  }

  function removePrinciple(text) {
    var principles = getPrinciples().filter(function(p) { return p.text !== text; });
    safeSet(KEY_PRINCIPLES, principles);
  }

  // ==================== XP 与等级 ====================
  function computeXP() {
    var xp = 0, chaptersTotal = 0, completedBooks = 0, startedDomains = 0;
    Object.keys(BOOK_META).forEach(function(slug) {
      var bp = getBookProgress(slug);
      chaptersTotal += bp.read;
      if (bp.total > 0 && bp.read >= bp.total) completedBooks++;
    });
    DOMAINS.forEach(function(d) {
      if (getDomainProgress(d.key).started) startedDomains++;
    });
    var principles = getPrinciples().length;
    xp = chaptersTotal * 1 + principles * 2 + completedBooks * 5 + startedDomains * 2;
    return { xp: xp, chaptersTotal: chaptersTotal, completedBooks: completedBooks, startedDomains: startedDomains, principles: principles };
  }

  function computeLevel(xp) {
    var cur = LEVELS[0];
    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xpNeeded) { cur = LEVELS[i]; break; }
    }
    var next = cur.level < 9 ? LEVELS[cur.level] : null;
    return { level: cur.level, name: cur.name, emoji: cur.emoji, xpNeeded: cur.xpNeeded, next: next };
  }

  // ==================== 打卡 Streak ====================
  function getStreak() {
    return safeJSON(localStorage.getItem(KEY_STREAK), { dates: [], longest: 0 });
  }

  function markToday() {
    var streak = getStreak();
    var today = new Date().toISOString().slice(0, 10);
    if (streak.dates.indexOf(today) !== -1) return streak; // 今天已打卡

    streak.dates.push(today);
    streak.dates.sort();

    // 计算连续天数
    var current = 1;
    for (var i = streak.dates.length - 2; i >= 0; i--) {
      var prev = new Date(streak.dates[i]);
      var next = new Date(streak.dates[i + 1]);
      if ((next - prev) / 86400000 <= 1.5) {
        current++;
      } else {
        break;
      }
    }
    streak.current = current;
    if (current > streak.longest) streak.longest = current;

    safeSet(KEY_STREAK, streak);
    return streak;
  }

  // ==================== 公开 API ====================
  return {
    // 数据查询
    BOOK_META: BOOK_META,
    DOMAINS: DOMAINS,
    LEVELS: LEVELS,
    LV_COLOR: LV_COLOR,
    LV_EMOJI: LV_EMOJI,

    // 书籍
    getBook: function(slug) { return BOOK_META[slug] || null; },
    getAllBooks: function() { return Object.keys(BOOK_META).map(function(k) { return BOOK_META[k]; }); },

    // 进度
    getProgress: getProgress,
    getBookProgress: getBookProgress,
    getDomainProgress: getDomainProgress,
    markChapterRead: markChapterRead,

    // 原则
    getPrinciples: getPrinciples,
    addPrinciple: addPrinciple,
    removePrinciple: removePrinciple,

    // XP
    computeXP: computeXP,
    computeLevel: computeLevel,

    // Streak
    getStreak: getStreak,
    markToday: markToday,

    // 工具
    safeJSON: safeJSON
  };
})();

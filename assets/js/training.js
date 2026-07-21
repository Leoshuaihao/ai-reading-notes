/**
 * AI精读笔记 — 投资技能训练场
 * 
 * 为每个知识点提供4层递进训练：概念层 → 引导层 → 练习层 → 实战层
 * 进度自动写入 ability_profile localStorage，驱动能力画像雷达图。
 * 
 * 依赖：data_v2.js（KNOWLEDGE_POINTS, COMPANY_CASES, AppData API）
 * 
 * V2 升级：数据驱动架构 — 优先读 kp.training 新字段 + COMPUTATION_REGISTRY，
 *         回退到 switch/case 硬编码（标注 @deprecated）。
 */
(function() {
  'use strict';

  // ==================== COMPUTATION_REGISTRY ====================
  // 不同知识点的计算模式完全不同，纯 JSON 无法表达差异。
  // 展示文案从 kp.training 读，计算逻辑在此注册。

  var COMPUTATION_REGISTRY = {};

  /**
   * 容差校验工具函数
   */
  function withinTolerance(user, expected, tolerance) {
    if (expected === 0) return user === 0;
    return Math.abs(user - expected) / Math.abs(expected) <= tolerance;
  }

  // ---- 策略 1: owner-earnings（线性三步计算）----
  COMPUTATION_REGISTRY['owner-earnings'] = {
    type: 'linear',
    compute: function(d) {
      var step1 = d.netProfit + d.depreciation;
      var step2 = step1 - d.maintenanceCapex;
      return { step1: step1, final: step2 };
    },
    renderGuidedSteps: function(d, r) {
      return '<div class="guided-step"><span class="step-num">第一步：</span>净利润 = <strong>' + d.netProfit + '亿</strong></div>' +
        '<div class="guided-step"><span class="step-num">第二步：</span>+' + d.depreciation + '亿 = <strong>' + r.step1 + '亿</strong></div>' +
        '<div class="guided-step"><span class="step-num">第三步：</span>-' + d.maintenanceCapex + '亿 = <strong>' + r.final + '亿</strong></div>' +
        '<div class="guided-result">✅ 股东盈余 = <strong>' + r.final + '亿</strong></div>';
    },
    getPracticeInputs: function() {
      return '<div class="practice-input-row"><label>股东盈余 = ?</label><input type="number" class="practice-input" id="pi-final" placeholder="亿"></div>';
    },
    getExpected: function(d) {
      var r = this.compute(d);
      return { final: r.final };
    },
    validateAnswers: function(user, expected) {
      return { final: withinTolerance(user.final, expected.final, 0.05) };
    },
    getRealWorldInputs: function() {
      return '<div class="practice-input-row"><label>计算股东盈余 = ?</label><input type="number" class="practice-input" id="rw-earnings" placeholder="亿"></div>';
    },
    getRealWorldExpected: function(d) {
      return { earnings: this.compute(d).final };
    },
    renderResult: function(d, r, judge) {
      return '✅ 股东盈余 = <strong>' + r.earnings + '亿</strong> | 判断：' + (judge || '—');
    }
  };

  // ---- 策略 2: dcf-model（迭代计算，5年折现 for 循环）----
  COMPUTATION_REGISTRY['dcf-model'] = {
    type: 'iterative',
    compute: function(d) {
      var g = d.growthRate5y || 0.12;
      var r = d.discountRate || 0.10;
      var fcf = d.freeCashFlow || d.netProfit;  // 回退：如果无 FCF 用净利润
      var cf = fcf;
      var pvSum = 0;
      var yearly = [];
      for (var i = 1; i <= 5; i++) {
        cf = Math.round(cf * (1 + g));
        var pv = Math.round(cf / Math.pow(1 + r, i));
        pvSum += pv;
        yearly.push({ year: i, cf: cf, pv: pv });
      }
      var terminalValue = Math.round(cf * 1.03 / (r - 0.03) / Math.pow(1 + r, 5));
      return { yearly: yearly, pvSum: pvSum, terminalValue: terminalValue, intrinsic: pvSum + terminalValue };
    },
    renderGuidedSteps: function(d, r) {
      var html = '';
      for (var i = 0; i < r.yearly.length; i++) {
        var y = r.yearly[i];
        html += '<div class="guided-step"><span class="step-num">第' + y.year + '年：</span>' +
          'CF = <strong>' + y.cf + '亿</strong> | PV = <strong>' + y.pv + '亿</strong></div>';
      }
      html += '<div class="guided-step"><span class="step-num">永续价值：</span>' +
        'TV = <strong>' + r.terminalValue + '亿</strong></div>';
      html += '<div class="guided-result">✅ 5年折现现金流之和 = <strong>' + r.pvSum + '亿</strong> | 内在价值 = <strong>' + r.intrinsic + '亿</strong></div>' +
        '<div class="guided-insight">💡 当前市价如果明显低于内在价值，就存在安全边际。</div>';
      return html;
    },
    getPracticeInputs: function() {
      return '<div class="practice-input-row"><label>5年折现现金流之和 = ?</label><input type="number" class="practice-input" id="pi-pvsum" placeholder="亿"></div>';
    },
    getExpected: function(d) {
      var r = this.compute(d);
      return { pvSum: r.pvSum };
    },
    validateAnswers: function(user, expected) {
      return { pvSum: withinTolerance(user.pvSum, expected.pvSum, 0.05) };
    },
    getRealWorldInputs: function() {
      return '<div class="practice-input-row"><label>计算5年折现现金流之和 = ?</label><input type="number" class="practice-input" id="rw-pvsum" placeholder="亿"></div>';
    },
    getRealWorldExpected: function(d) {
      var r = this.compute(d);
      return { pvSum: r.pvSum };
    },
    renderResult: function(d, r, judge) {
      return '✅ 5年折现值之和 = <strong>' + (r.pvSum || 0) + '亿</strong> | 判断：' + (judge || '—');
    }
  };

  // ---- 策略 3: roe-decomposition（因子计算，四值联动）----
  COMPUTATION_REGISTRY['roe-decomposition'] = {
    type: 'factor',
    compute: function(d) {
      var netMargin = Math.round(d.netProfit / d.revenue * 1000) / 10;
      var turnover = Math.round(d.revenue / d.totalAssets * 1000) / 1000;
      var leverage = Math.round(d.totalAssets / d.equity * 1000) / 1000;
      var roe = Math.round(netMargin * turnover * leverage * 10) / 10;
      return { netMargin: netMargin, turnover: turnover, leverage: leverage, roe: roe };
    },
    renderGuidedSteps: function(d, r) {
      return '<div class="guided-step"><span class="step-num">第一步：</span>计算净利润率<br>' +
        '净利润率 = ' + d.netProfit + ' / ' + d.revenue + ' = <strong>' + r.netMargin + '%</strong></div>' +
        '<div class="guided-step"><span class="step-num">第二步：</span>计算资产周转率<br>' +
        '资产周转率 = ' + d.revenue + ' / ' + d.totalAssets + ' = <strong>' + r.turnover.toFixed(3) + '</strong></div>' +
        '<div class="guided-step"><span class="step-num">第三步：</span>计算权益乘数<br>' +
        '权益乘数 = ' + d.totalAssets + ' / ' + d.equity + ' = <strong>' + r.leverage.toFixed(3) + '</strong></div>' +
        '<div class="guided-result">✅ ROE = <strong>' + r.roe + '%</strong>' +
        '（' + r.netMargin + '% × ' + r.turnover.toFixed(3) + ' × ' + r.leverage.toFixed(3) + '）</div>' +
        '<div class="guided-insight">💡 ROE主要由净利润率驱动→说明产品有定价权。权益乘数仅' + r.leverage.toFixed(3) + '，杠杆低，安全。</div>';
    },
    getPracticeInputs: function() {
      return '<div class="practice-input-row"><label>净利润率 = ?（%）</label><input type="number" step="0.1" class="practice-input" id="pi-netMargin" placeholder="%"></div>' +
        '<div class="practice-input-row"><label>资产周转率 = ?</label><input type="number" step="0.001" class="practice-input" id="pi-turnover" placeholder="次"></div>' +
        '<div class="practice-input-row"><label>权益乘数 = ?</label><input type="number" step="0.001" class="practice-input" id="pi-leverage" placeholder="倍"></div>' +
        '<div class="practice-input-row"><label>ROE = ?（%）</label><input type="number" step="0.1" class="practice-input" id="pi-roe" placeholder="%"></div>';
    },
    getExpected: function(d) {
      return this.compute(d);
    },
    validateAnswers: function(user, expected) {
      return {
        netMargin: withinTolerance(user.netMargin, expected.netMargin, 0.05),
        turnover: withinTolerance(user.turnover, expected.turnover, 0.05),
        leverage: withinTolerance(user.leverage, expected.leverage, 0.05),
        roe: withinTolerance(user.roe, expected.roe, 0.05)
      };
    },
    getRealWorldInputs: function() {
      return '<div class="practice-input-row"><label>净利润率 = ?（%）</label><input type="number" step="0.1" class="practice-input" id="rw-netMargin" placeholder="%"></div>' +
        '<div class="practice-input-row"><label>资产周转率 = ?</label><input type="number" step="0.001" class="practice-input" id="rw-turnover" placeholder="次"></div>' +
        '<div class="practice-input-row"><label>权益乘数 = ?</label><input type="number" step="0.001" class="practice-input" id="rw-leverage" placeholder="倍"></div>' +
        '<div class="practice-input-row"><label>ROE = ?（%）</label><input type="number" step="0.1" class="practice-input" id="rw-roe" placeholder="%"></div>';
    },
    getRealWorldExpected: function(d) {
      return this.compute(d);
    },
    renderResult: function(d, r, judge) {
      return '✅ ROE = <strong>' + (r.roe || 0) + '%</strong> | 判断：' + (judge || '—');
    }
  };

  // ---- 策略 4: safety-margin（线性计算，百分比公式）----
  COMPUTATION_REGISTRY['safety-margin'] = {
    type: 'linear',
    compute: function(d) {
      // 安全边际 = (内在价值 - 买入价格) / 内在价值 × 100%
      var iv = d.intrinsicValue || (d.netProfit || 0);
      var price = d.buyPrice || d.price || 0;
      var margin = iv > 0 ? Math.round((iv - price) / iv * 1000) / 10 : 0;
      return { margin: margin };
    },
    renderGuidedSteps: function(d, r, trainingData) {
      // 如果 trainingData 有 guided.steps，使用数据驱动渲染
      if (trainingData && trainingData.guided && trainingData.guided.steps) {
        var steps = trainingData.guided.steps;
        var html = '';
        for (var i = 0; i < steps.length; i++) {
          html += '<div class="guided-step"><span class="step-num">' + steps[i].label + '</span>' + steps[i].formula + '</div>';
        }
        return html;
      }
      // 回退：通用安全边际计算
      return '<div class="guided-step"><span class="step-num">第一步：</span>确定内在价值</div>' +
        '<div class="guided-step"><span class="step-num">第二步：</span>确定买入价格</div>' +
        '<div class="guided-step"><span class="step-num">第三步：</span>计算安全边际 = (内在价值-买入价)/内在价值</div>' +
        '<div class="guided-result">✅ 安全边际 = <strong>' + r.margin + '%</strong></div>';
    },
    getPracticeInputs: function() {
      return '<div class="practice-input-row"><label>安全边际 = ?（%）</label><input type="number" step="0.1" class="practice-input" id="pi-margin" placeholder="%"></div>';
    },
    getExpected: function(d) {
      var r = this.compute(d);
      return { margin: r.margin };
    },
    validateAnswers: function(user, expected) {
      return { margin: withinTolerance(user.margin, expected.margin, 0.05) };
    },
    getRealWorldInputs: function() {
      return '<div class="practice-input-row"><label>安全边际 = ?（%）</label><input type="number" step="0.1" class="practice-input" id="rw-margin" placeholder="%"></div>';
    },
    getRealWorldExpected: function(d) {
      var r = this.compute(d);
      return { margin: r.margin };
    },
    renderResult: function(d, r, judge) {
      return '✅ 安全边际 = <strong>' + (r.margin || 0) + '%</strong> | 判断：' + (judge || '—');
    }
  };

  // ---- 策略 5: moat-judgment（定性判断，关键词匹配）----
  COMPUTATION_REGISTRY['moat-judgment'] = {
    type: 'judgment',
    compute: function(d) { return {}; },
    renderGuidedSteps: function(d, r, trainingData) {
      var steps = (trainingData && trainingData.guided && trainingData.guided.steps) || [];
      var html = '';
      for (var i = 0; i < steps.length; i++) {
        html += '<div class="guided-step"><span class="step-num">' + steps[i].label + '</span>' + (steps[i].formula || '') + '</div>';
      }
      return html;
    },
    getPracticeInputs: function() {
      return '<div class="practice-input-row"><textarea class="practice-input" id="pi-text" placeholder="写出你的分析..." style="width:100%;min-height:120px;"></textarea></div>';
    },
    getExpected: function(d) { return {}; },
    validateAnswers: function(user, expected, keywords) {
      if (!keywords || keywords.length === 0) return { match: true };
      var text = (user.text || '').toLowerCase();
      var hits = 0;
      for (var i = 0; i < keywords.length; i++) {
        if (text.indexOf(keywords[i].toLowerCase()) !== -1) hits++;
      }
      return { match: hits >= Math.ceil(keywords.length * 0.6) };
    },
    getRealWorldInputs: function() {
      return '<div class="practice-input-row"><textarea class="practice-input" id="rw-analysis" placeholder="分析这家公司..." style="width:100%;min-height:120px;"></textarea></div>';
    },
    getRealWorldExpected: function(d) { return {}; },
    renderResult: function(d, r, judge) {
      return '📝 你的分析已记录' + (judge ? ' | 判断：' + judge : '');
    }
  };

  // ---- 策略 6-8: judgment 型策略（复用 moat-judgment 模式）----
  COMPUTATION_REGISTRY['cycle-judgment'] = COMPUTATION_REGISTRY['moat-judgment'];
  COMPUTATION_REGISTRY['lollapalooza-judgment'] = COMPUTATION_REGISTRY['moat-judgment'];
  COMPUTATION_REGISTRY['barbell-judgment'] = COMPUTATION_REGISTRY['moat-judgment'];

  // ==================== 状态 ====================
  var currentKpId = null;
  var currentLevelIdx = 0;
  var LEVEL_KEYS = ['concept', 'guided', 'practice', 'real_world'];
  var LEVEL_NAMES = ['概念层', '引导层', '练习层', '实战层'];
  var LEVEL_EMOJIS = ['💡', '🧑‍🏫', '🏋️', '🏔️'];
  var selectedCompany = null;

  // ==================== Modal 骨架 ====================

  /** 获取 Modal DOM 或创建它 */
  function getModal() {
    var modal = document.getElementById('trainingModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'trainingModal';
    modal.className = 'training-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="training-backdrop" onclick="closeTrainingModal()"></div>' +
      '<div class="training-dialog">' +
        '<div class="training-header">' +
          '<h3 id="trainingTitle"></h3>' +
          '<button class="training-close" onclick="closeTrainingModal()" aria-label="关闭">✕</button>' +
        '</div>' +
        '<div class="training-level-bar" id="trainingLevelBar"></div>' +
        '<div id="trainingContent"></div>' +
        '<div class="training-footer" id="trainingFooter"></div>' +
      '</div>';
    document.body.appendChild(modal);
    return modal;
  }

  /** 打开训练场 Modal */
  window.openTrainingModal = function(kpId) {
    currentKpId = kpId;
    selectedCompany = null;

    // 找到当前进度，定位到第一个未完成的层
    var progress = AppData.getKpProgress(kpId);
    var kpDef = findKpDef(kpId);
    if (!kpDef) return;

    // 追踪训练开始
    if (typeof window.analytics !== 'undefined') {
      window.analytics.track('training_started', {
        kp_id: kpId, kp_name: kpDef.name, domain: kpDef.domain
      });
    }

    currentLevelIdx = 0;
    for (var i = 0; i < LEVEL_KEYS.length; i++) {
      if (!progress.levels[LEVEL_KEYS[i]]) {
        currentLevelIdx = i;
        break;
      }
    }

    var modal = getModal();
    modal.hidden = false;
    renderTraining();
  };

  /** 关闭 Modal */
  window.closeTrainingModal = function() {
    var modal = document.getElementById('trainingModal');
    if (modal) modal.hidden = true;
    currentKpId = null;
    selectedCompany = null;
  };

  // ==================== 渲染 ====================

  function findKpDef(kpId) {
    var kps = AppData.KNOWLEDGE_POINTS;
    for (var i = 0; i < kps.length; i++) {
      if (kps[i].id === kpId) return kps[i];
    }
    return null;
  }

  function renderTraining() {
    var kp = findKpDef(currentKpId);
    if (!kp) return;

    // 标题
    var progress = AppData.getKpProgress(currentKpId);
    document.getElementById('trainingTitle').innerHTML = kp.emoji + ' ' + kp.name + ' · 训练场';

    // 层级进度条
    var barHtml = '';
    LEVEL_KEYS.forEach(function(lv, i) {
      var cls = 'training-level-dot';
      if (progress.levels[lv]) cls += ' completed';
      else if (i === currentLevelIdx) cls += ' active';
      barHtml += '<span class="' + cls + '">' + LEVEL_EMOJIS[i] + ' ' + LEVEL_NAMES[i] + '</span>';
    });
    document.getElementById('trainingLevelBar').innerHTML = barHtml;

    // 根据层渲染内容
    var levelKey = LEVEL_KEYS[currentLevelIdx];
    switch (levelKey) {
      case 'concept': renderConceptLevel(kp); break;
      case 'guided': renderGuidedLevel(kp); break;
      case 'practice': renderPracticeLevel(kp); break;
      case 'real_world': renderRealWorldLevel(kp); break;
    }

    // 底部来源
    var bookSlug = kp.book || (kp.chapters ? Object.keys(kp.chapters)[0] : null);
    var bookRef = bookSlug && AppData.getBook ? (AppData.getBook(bookSlug) || {}).title || '' : '';
    document.getElementById('trainingFooter').innerHTML =
      '<div class="kp-source" style="text-align:center;padding-top:16px;">' +
      '来源：《' + bookRef + '》' + (kp.chapterRef || '') + '</div>';
  }

  // ==================== 概念层 ====================
  function renderConceptLevel(kp) {
    var formulaHtml = kp.formulaDisplay || (kp.formula ? '<b>' + kp.formula + '</b>' : '');
    var keyPoints = kp.conceptKeyPoints || getConceptKeyPoints(kp.id);

    var html =
      '<div class="concept-formula">' + formulaHtml + '</div>' +
      '<div class="concept-description">' + (kp.description || '') + '</div>' +
      '<ul class="concept-key-points">' + keyPoints.map(function(p) {
        return '<li>' + p + '</li>';
      }).join('') + '</ul>' +
      '<div style="text-align:center">' +
        '<button class="training-submit-btn" onclick="completeLevel(\'' + currentKpId + '\',\'concept\')">我已理解 ✓</button>' +
      '</div>';
    document.getElementById('trainingContent').innerHTML = html;
  }

  /**
   * @deprecated 概念层回退逻辑 —— 仅当 kp.conceptKeyPoints 未定义时使用
   */
  function getConceptKeyPoints(kpId) {
    switch (kpId) {
      case 'owner-earnings':
        return ['净利润 ≠ 经济利润（会计利润含水分）', '折旧是"非现金支出"，需要加回', '维持性资本支出是保持竞争力的必要投入'];
      case 'dcf-model':
        return ['折现率：巴菲特常用10%（无风险利率+风险溢价）', '成长率：根据公司护城河和历史增速估算', '永续增长：5年后假设3%永续增长（保守估计）'];
      case 'roe-decomposition':
        return ['净利润率 = 净利润/收入（衡量赚钱效率）', '资产周转率 = 收入/总资产（衡量运营效率）', '权益乘数 = 总资产/权益（衡量杠杆倍数—越小越好）'];
      default: return ['暂无要点'];
    }
  }

  // ==================== 引导层 ====================
  function renderGuidedLevel(kp) {
    var strategy = COMPUTATION_REGISTRY[kp.trainingStrategy];

    // 数据驱动路径：优先使用 kp.training.guided
    if (kp.training && kp.training.guided && strategy) {
      var td = kp.training;
      var d = td.practice ? td.practice.data : {};
      var r = strategy.compute ? strategy.compute(d) : {};

      var html = '<div class="practice-company-card">' +
        '<div class="company-name">📊 ' + (td.guided.intro || '') + '</div>' +
        '</div>';

      // 策略渲染步骤
      html += strategy.renderGuidedSteps(d, r, td);

      html += '<div style="text-align:center;margin-top:20px">' +
        '<button class="training-submit-btn" onclick="completeLevel(\'' + kp.id + '\',\'guided\')">继续练习 ✓</button>' +
        '</div>';
      document.getElementById('trainingContent').innerHTML = html;
      return;
    }

    // @deprecated 回退：现有硬编码逻辑
    var caseKey = kp.guidedCase;
    var company = caseKey ? AppData.COMPANY_CASES[caseKey] : null;
    if (!company) {
      document.getElementById('trainingContent').innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-secondary);">暂无引导数据</div>';
      return;
    }

    var html = '<div class="practice-company-card">' +
      '<div class="company-name">📊 案例公司：' + company.name + ' (' + company.year + '年报)</div>' +
      '<div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">' +
      formatCompanyData(company) +
      '</div></div>';

    html += getGuidedSteps(kp.id, company);

    html += '<div style="text-align:center;margin-top:20px">' +
      '<button class="training-submit-btn" onclick="completeLevel(\'' + kp.id + '\',\'guided\')">继续练习 ✓</button>' +
      '</div>';
    document.getElementById('trainingContent').innerHTML = html;
  }

  function formatCompanyData(company) {
    var d = company.data;
    return '营业收入: ' + d.revenue + '亿 &nbsp; 净利润: ' + d.netProfit + '亿<br>' +
      '折旧摊销: ' + d.depreciation + '亿 &nbsp; 维持性资本支出: ' + d.maintenanceCapex + '亿<br>' +
      '总资产: ' + d.totalAssets + '亿 &nbsp; 所有者权益: ' + d.equity + '亿<br>' +
      '自由现金流: ' + d.freeCashFlow + '亿';
  }

  /**
   * @deprecated 引导层回退逻辑 —— 仅当 kp.training.guided 不可用时使用
   */
  function getGuidedSteps(kpId, company) {
    var d = company.data;
    switch (kpId) {
      case 'owner-earnings':
        var step1 = d.netProfit + d.depreciation;
        var step2 = step1 - d.maintenanceCapex;
        var insightText = step2 < d.netProfit
          ? '维持性资本支出(' + d.maintenanceCapex + '亿) > 折旧(' + d.depreciation + '亿)，说明' + company.name + '需要持续投入资金维护竞争优势。'
          : '股东盈余 > 净利润，折旧远超资本支出，公司有"隐性利润"。';
        return '<div class="guided-step"><span class="step-num">第一步：</span>找到净利润<br>净利润 = <strong>' + d.netProfit + '亿</strong></div>' +
          '<div class="guided-step"><span class="step-num">第二步：</span>加回折旧摊销<br>' + d.netProfit + ' + ' + d.depreciation + ' = <strong>' + step1 + '亿</strong></div>' +
          '<div class="guided-step"><span class="step-num">第三步：</span>减去维持性资本支出<br>' + step1 + ' - ' + d.maintenanceCapex + ' = <strong>' + step2 + '亿</strong></div>' +
          '<div class="guided-result">✅ ' + company.name + '的股东盈余 = <strong>' + step2 + '亿</strong></div>' +
          '<div class="guided-insight">💡 ' + insightText + '</div>';

      case 'dcf-model':
        var g = d.growthRate5y;
        var r = d.discountRate;
        var fcf = d.freeCashFlow;
        var cf = fcf;
        var pvSum = 0;
        var stepsHtml = '';
        for (var i = 1; i <= 5; i++) {
          cf = Math.round(cf * (1 + g));
          var pv = Math.round(cf / Math.pow(1 + r, i));
          pvSum += pv;
          stepsHtml += '<div class="guided-step"><span class="step-num">第' + i + '年：</span>' +
            'CF = ' + (i === 1 ? fcf : Math.round(cf / (1 + g))) + ' × (1+' + (g*100) + '%) = <strong>' + cf + '亿</strong><br>' +
            'PV = ' + cf + ' / (1+' + (r*100) + '%)^' + i + ' = <strong>' + pv + '亿</strong></div>';
        }
        var terminalValue = Math.round(cf * 1.03 / (r - 0.03) / Math.pow(1 + r, 5));
        stepsHtml += '<div class="guided-step"><span class="step-num">永续价值：</span>' +
          'TV = ' + cf + ' × 1.03 ÷ (' + (r*100) + '% - 3%) ÷ (1+' + (r*100) + '%)^5 = <strong>' + terminalValue + '亿</strong></div>';
        return stepsHtml +
          '<div class="guided-result">✅ 5年折现现金流之和 = <strong>' + pvSum + '亿</strong> | 内在价值 = <strong>' + (pvSum + terminalValue) + '亿</strong></div>' +
          '<div class="guided-insight">💡 当前市价如果明显低于内在价值，就存在安全边际。</div>';

      case 'roe-decomposition':
        var netMargin = Math.round(d.netProfit / d.revenue * 1000) / 10;
        var turnover = Math.round(d.revenue / d.totalAssets * 1000) / 1000;
        var leverage = Math.round(d.totalAssets / d.equity * 1000) / 1000;
        var roe = Math.round(netMargin * turnover * leverage * 10) / 10;
        return '<div class="guided-step"><span class="step-num">第一步：</span>计算净利润率<br>' +
          '净利润率 = ' + d.netProfit + ' / ' + d.revenue + ' = <strong>' + netMargin + '%</strong></div>' +
          '<div class="guided-step"><span class="step-num">第二步：</span>计算资产周转率<br>' +
          '资产周转率 = ' + d.revenue + ' / ' + d.totalAssets + ' = <strong>' + turnover.toFixed(3) + '</strong></div>' +
          '<div class="guided-step"><span class="step-num">第三步：</span>计算权益乘数<br>' +
          '权益乘数 = ' + d.totalAssets + ' / ' + d.equity + ' = <strong>' + leverage.toFixed(3) + '</strong></div>' +
          '<div class="guided-result">✅ ' + company.name + '的ROE = <strong>' + roe + '%</strong>' +
          '（' + netMargin + '% × ' + turnover.toFixed(3) + ' × ' + leverage.toFixed(3) + '）</div>' +
          '<div class="guided-insight">💡 茅台ROE' + roe + '% 主要由净利润率驱动——说明产品有定价权。权益乘数仅' + leverage.toFixed(3) + '，杠杆很低，安全。</div>';

      default: return '';
    }
  }

  // ==================== 练习层 ====================
  function renderPracticeLevel(kp) {
    var strategy = COMPUTATION_REGISTRY[kp.trainingStrategy];

    // 数据驱动路径
    if (kp.training && kp.training.practice && strategy) {
      var td = kp.training;
      var html = '<div class="practice-company-card">' +
        '<div class="company-name">🏋️ ' + (td.practice.scenario || '请完成以下练习') + '</div>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">请填写答案（允许5%误差）</div>';

      html += strategy.getPracticeInputs();

      // 存储 training 数据供 submit 使用
      window._practiceData = td.practice;
      window._practiceStrategy = strategy;

      html += '<div id="practiceResult"></div>' +
        '<div style="text-align:center;margin-top:20px">' +
          '<button class="training-submit-btn" onclick="submitPractice(\'' + kp.id + '\')">提交答案</button>' +
        '</div>';
      document.getElementById('trainingContent').innerHTML = html;
      return;
    }

    // @deprecated 回退：现有硬编码逻辑
    var caseKey = kp.practiceCase;
    var company = caseKey ? AppData.COMPANY_CASES[caseKey] : null;
    if (!company) {
      document.getElementById('trainingContent').innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-secondary);">暂无练习数据</div>';
      return;
    }

    var d = company.data;
    var html = '<div class="practice-company-card">' +
      '<div class="company-name">🏋️ 请计算：' + company.name + ' (' + company.year + '年报)</div>' +
      '<div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">' +
      formatCompanyData(company) +
      '</div></div>' +
      '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">请填写计算结果（允许5%误差）</div>';

    html += getPracticeInputs(kp.id, company);

    html += '<div id="practiceResult"></div>' +
      '<div style="text-align:center;margin-top:20px">' +
        '<button class="training-submit-btn" onclick="submitPractice(\'' + kp.id + '\')">提交答案</button>' +
      '</div>';
    document.getElementById('trainingContent').innerHTML = html;
  }

  /**
   * @deprecated 练习层回退逻辑
   */
  function getPracticeInputs(kpId, company) {
    var d = company.data;
    switch (kpId) {
      case 'owner-earnings':
        return '<div class="practice-input-row"><label>第一步：净利润 + 折旧摊销 = ?</label>' +
          '<input type="number" class="practice-input" id="pi-step1" placeholder="亿"></div>' +
          '<div class="practice-input-row"><label>第二步：以上结果 - 维持性资本支出 = ?</label>' +
          '<input type="number" class="practice-input" id="pi-step2" placeholder="亿"></div>' +
          '<div class="practice-input-row"><label>股东盈余 = ?</label>' +
          '<input type="number" class="practice-input" id="pi-final" placeholder="亿"></div>';

      case 'dcf-model':
        return '<div class="practice-input-row"><label>5年折现现金流之和 = ?</label>' +
          '<input type="number" class="practice-input" id="pi-pvsum" placeholder="亿"></div>' +
          '<div style="font-size:12px;color:var(--text-secondary);margin:8px 0 16px;">' +
          '提示：FCF=' + d.freeCashFlow + '亿, 增长=' + (d.growthRate5y*100) + '%, 折现=' + (d.discountRate*100) + '%<br>' +
          '第1年PV = FCF×(1+g)/(1+r), 第2年PV = FCF×(1+g)²/(1+r)² ...</div>';

      case 'roe-decomposition':
        return '<div class="practice-input-row"><label>净利润率 = ?（%）</label>' +
          '<input type="number" step="0.1" class="practice-input" id="pi-netMargin" placeholder="%"></div>' +
          '<div class="practice-input-row"><label>资产周转率 = ?</label>' +
          '<input type="number" step="0.001" class="practice-input" id="pi-turnover" placeholder="次"></div>' +
          '<div class="practice-input-row"><label>权益乘数 = ?</label>' +
          '<input type="number" step="0.001" class="practice-input" id="pi-leverage" placeholder="倍"></div>' +
          '<div class="practice-input-row"><label>ROE = ?（%）</label>' +
          '<input type="number" step="0.1" class="practice-input" id="pi-roe" placeholder="%"></div>';

      default: return '';
    }
  }

  /** 校验并提交练习层答案 */
  window.submitPractice = function(kpId) {
    var kp = findKpDef(kpId);
    if (!kp) return;

    var resultHtml = '';
    var allCorrect = false;

    // 数据驱动路径
    var strategy = window._practiceStrategy || COMPUTATION_REGISTRY[kp.trainingStrategy];
    if (kp.training && kp.training.practice && strategy) {
      var td = kp.training;

      if (strategy.type === 'judgment') {
        // 定性判断：关键词匹配
        var textEl = document.getElementById('pi-text');
        var text = textEl ? textEl.value : '';
        var keywords = (td.practice.questions && td.practice.questions[0])
          ? td.practice.questions[0].keywords || []
          : [];
        var valid = strategy.validateAnswers({ text: text }, {}, keywords);
        if (valid.match) {
          allCorrect = true;
          resultHtml = '<div class="training-result correct">✅ 分析通过！关键词匹配达标。</div>';
        } else {
          var hintText = (td.practice.questions && td.practice.questions[0])
            ? td.practice.questions[0].hint || ''
            : '';
          resultHtml = '<div class="training-result wrong">✗ 分析不够深入，请覆盖更多要点<br>💡 提示：' + hintText + '</div>';
        }
      } else {
        // 定量计算
        var userInputs = collectInputs(strategy);
        var expected = strategy.getExpected(td.practice.data);
        var result = strategy.validateAnswers(userInputs, expected);
        allCorrect = allTrue(result);
        if (!allCorrect) {
          var expStrs = [];
          Object.keys(expected).forEach(function(k) { expStrs.push(k + '=' + expected[k]); });
          resultHtml = '<div class="training-result wrong">✗ 答案有误<br>期望：' + expStrs.join(', ') + '（允许5%误差）</div>';
        }
      }

      if (allCorrect) {
        resultHtml = '<div class="training-result correct">✅ 全部正确！' + kp.name + '你已经掌握了。</div>';
        AppData.markLevelCompleted(kpId, 'practice', { attempts: (kp._attempts || 0) + 1, completedAt: new Date().toISOString() });
        setTimeout(function() { advanceLevel(kpId); }, 1500);
      } else {
        kp._attempts = (kp._attempts || 0) + 1;
      }

      document.getElementById('practiceResult').innerHTML = resultHtml;
      return;
    }

    // @deprecated 回退：现有硬编码逻辑
    var expected = kp.practiceExpected;
    var userInputs = {};

    switch (kpId) {
      case 'owner-earnings':
        userInputs = { step1: val('pi-step1'), step2: val('pi-step2'), final: val('pi-final') };
        allCorrect = checkVal('pi-step1', userInputs.step1, expected.step1) &&
                     checkVal('pi-step2', userInputs.step2, expected.step2) &&
                     checkVal('pi-final', userInputs.final, expected.final);
        if (!allCorrect) {
          resultHtml = '<div class="training-result wrong">✗ 答案有误<br>正确答案：第一步 ' + expected.step1 + '亿, 第二步 ' + expected.step2 + '亿, 股东盈余 ' + expected.final + '亿</div>';
        }
        break;

      case 'dcf-model':
        userInputs = { pvSum: val('pi-pvsum') };
        allCorrect = checkVal('pi-pvsum', userInputs.pvSum, expected.pvSum);
        if (!allCorrect) {
          resultHtml = '<div class="training-result wrong">✗ 答案有误<br>正确答案：5年折现值之和约 ' + expected.pvSum + '亿（允许5%误差）</div>';
        }
        break;

      case 'roe-decomposition':
        userInputs = { netMargin: valFloat('pi-netMargin'), turnover: valFloat('pi-turnover'), leverage: valFloat('pi-leverage'), roe: valFloat('pi-roe') };
        allCorrect = checkVal('pi-netMargin', userInputs.netMargin, expected.netMargin) &&
                     checkVal('pi-turnover', userInputs.turnover, expected.turnover) &&
                     checkVal('pi-leverage', userInputs.leverage, expected.leverage) &&
                     checkVal('pi-roe', userInputs.roe, expected.roe);
        if (!allCorrect) {
          resultHtml = '<div class="training-result wrong">✗ 答案有误<br>正确答案：净利润率 ' + expected.netMargin + '%, 周转率 ' + expected.turnover + ', 权益乘数 ' + expected.leverage + ', ROE ' + expected.roe + '%</div>';
        }
        break;
    }

    if (allCorrect) {
      resultHtml = '<div class="training-result correct">✅ 全部正确！' + kp.name + '你已经掌握了。</div>';
      AppData.markLevelCompleted(kpId, 'practice', { attempts: 1, completedAt: new Date().toISOString() });
      setTimeout(function() { advanceLevel(kpId); }, 1500);
    }

    document.getElementById('practiceResult').innerHTML = resultHtml;
  };

  /** 从 DOM 收集用户输入（根据策略类型） */
  function collectInputs(strategy) {
    var user = {};
    if (strategy.type === 'linear') {
      // 通用：尝试读取 id="pi-final"
      user.final = val('pi-final');
      user.margin = valFloat('pi-margin');
    } else if (strategy.type === 'iterative') {
      user.pvSum = val('pi-pvsum');
    } else if (strategy.type === 'factor') {
      user.netMargin = valFloat('pi-netMargin');
      user.turnover = valFloat('pi-turnover');
      user.leverage = valFloat('pi-leverage');
      user.roe = valFloat('pi-roe');
    }
    return user;
  }

  function allTrue(result) {
    for (var k in result) {
      if (result.hasOwnProperty(k) && !result[k]) return false;
    }
    return true;
  }

  function val(id) { var el = document.getElementById(id); return el ? (parseInt(el.value) || 0) : 0; }
  function valFloat(id) { var el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; }

  function checkVal(fieldId, userVal, expectedVal) {
    var el = document.getElementById(fieldId);
    if (!el) return false;
    var correct = withinTolerance(userVal, expectedVal, 0.05);
    el.className = 'practice-input' + (correct ? ' correct' : ' wrong');
    return correct;
  }

  // ==================== 实战层 ====================
  function renderRealWorldLevel(kp) {
    // 数据驱动路径：使用 kp.training.realWorld
    if (kp.training && kp.training.realWorld && kp.training.realWorld.company) {
      var rw = kp.training.realWorld;
      var companyKey = rw.company;
      selectedCompany = companyKey;

      var c = AppData.COMPANY_CASES[companyKey];
      var html = '';

      if (c) {
        html += '<div class="practice-company-card">' +
          '<div class="company-name">' + c.name + ' (' + c.year + '年报)</div>' +
          '<div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">' +
          formatCompanyData(c) + '</div></div>' +
          '<div style="font-size:13px;color:var(--text-secondary);margin:8px 0;">' +
          (rw.analysis || '') + '</div>';

        // 输入区域
        var strategy = COMPUTATION_REGISTRY[kp.trainingStrategy];
        if (strategy && strategy.getRealWorldInputs) {
          html += strategy.getRealWorldInputs();
        }

        // 判断问题
        if (rw.decisionQuestion) {
          html += '<div style="margin-top:12px;font-size:14px;font-weight:600;">' + rw.decisionQuestion + '</div>' +
            '<div style="display:flex;flex-direction:column;gap:8px;margin:8px 0 16px;">' +
              '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="yes"> 是</label>' +
              '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="no"> 否</label>' +
              '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="more"> 需要更多数据</label>' +
            '</div>';
        }
      } else {
        html += '<div style="text-align:center;padding:20px;color:var(--text-secondary);">公司数据未找到: ' + companyKey + '</div>';
      }

      html += '<div id="rwResult"></div>' +
        '<div style="text-align:center;margin-top:20px">' +
          '<button class="training-submit-btn" onclick="submitRealWorld(\'' + kp.id + '\')">提交实战报告</button>' +
        '</div>';
      document.getElementById('trainingContent').innerHTML = html;
      return;
    }

    // @deprecated 回退：现有硬编码逻辑
    var companies = kp.realWorldCompanies;
    if (!companies || companies.length === 0) {
      document.getElementById('trainingContent').innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-secondary);">暂无实战数据</div>';
      return;
    }

    var html = '<div style="margin-bottom:16px;font-size:14px;color:var(--text-secondary);">' +
      '请从以下3家公司中选择1家，完成计算并判断投资价值：</div>' +
      '<div class="realworld-company-grid" id="rwCompanyGrid">';
    companies.forEach(function(ck) {
      var c = AppData.COMPANY_CASES[ck];
      if (!c) return;
      html += '<div class="realworld-company-card" data-company="' + ck +
        '" onclick="selectCompany(\'' + kp.id + '\',\'' + ck + '\')">' +
        '<div class="rc-name">' + c.name + '</div>' +
        '<div class="rc-industry">' + c.industry + '</div>' +
        '</div>';
    });
    html += '</div>';
    html += '<div id="rwDetail"></div>';
    document.getElementById('trainingContent').innerHTML = html;
  }

  /** 选择实战层公司 */
  window.selectCompany = function(kpId, companyKey) {
    selectedCompany = companyKey;

    var cards = document.querySelectorAll('.realworld-company-card');
    cards.forEach(function(card) {
      card.classList.remove('selected');
      if (card.getAttribute('data-company') === companyKey) card.classList.add('selected');
    });

    var company = AppData.COMPANY_CASES[companyKey];
    var kp = findKpDef(kpId);
    if (!company || !kp) return;

    var d = company.data;
    var html = '<div class="practice-company-card" style="margin-top:12px;">' +
      '<div class="company-name">' + company.name + ' (' + company.year + '年报)</div>' +
      '<div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">' +
      formatCompanyData(company) +
      '</div></div>';

    html += getRealWorldInputs(kpId, company);

    html += '<div id="rwResult"></div>' +
      '<div style="text-align:center;margin-top:20px">' +
        '<button class="training-submit-btn" onclick="submitRealWorld(\'' + kpId + '\')">提交实战报告</button>' +
      '</div>';
    document.getElementById('rwDetail').innerHTML = html;
  };

  /**
   * @deprecated 实战层输入回退逻辑
   */
  function getRealWorldInputs(kpId, company) {
    switch (kpId) {
      case 'owner-earnings':
        return '<div class="practice-input-row"><label>1. 计算股东盈余 = ?</label>' +
          '<input type="number" class="practice-input" id="rw-earnings" placeholder="亿"></div>' +
          '<div class="practice-input-row"><label>2. 股东盈余/净利润 比率 = ?</label>' +
          '<input type="number" step="0.1" class="practice-input" id="rw-ratio" placeholder="%"></div>' +
          '<div style="margin-top:12px;font-size:14px;font-weight:600;">3. 这家公司值得投资吗？</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;margin:8px 0 16px;">' +
            '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="yes"> 值得（股东盈余充足，维持性支出合理）</label>' +
            '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="no"> 不值得（维持性资本支出太高）</label>' +
            '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="more"> 需要更多数据</label>' +
          '</div>';

      case 'dcf-model':
        return '<div class="practice-input-row"><label>1. 计算5年折现现金流之和 = ?</label>' +
          '<input type="number" class="practice-input" id="rw-pvsum" placeholder="亿"></div>' +
          '<div style="margin-top:12px;font-size:14px;font-weight:600;">2. 这家公司的内在价值相比市值如何？</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;margin:8px 0 16px;">' +
            '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="undervalued"> 市值低于内在价值（低估）</label>' +
            '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="overvalued"> 市值高于内在价值（高估）</label>' +
            '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="fair"> 大致合理</label>' +
          '</div>';

      case 'roe-decomposition':
        return '<div class="practice-input-row"><label>净利润率 = ?（%）</label>' +
          '<input type="number" step="0.1" class="practice-input" id="rw-netMargin" placeholder="%"></div>' +
          '<div class="practice-input-row"><label>资产周转率 = ?</label>' +
          '<input type="number" step="0.001" class="practice-input" id="rw-turnover" placeholder="次"></div>' +
          '<div class="practice-input-row"><label>权益乘数 = ?</label>' +
          '<input type="number" step="0.001" class="practice-input" id="rw-leverage" placeholder="倍"></div>' +
          '<div class="practice-input-row"><label>ROE = ?（%）</label>' +
          '<input type="number" step="0.1" class="practice-input" id="rw-roe" placeholder="%"></div>' +
          '<div style="margin-top:12px;font-size:14px;font-weight:600;">ROE质量判断：这家公司的ROE主要由什么驱动？</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;margin:8px 0 16px;">' +
            '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="profit"> 高利润率驱动（产品好，护城河宽）</label>' +
            '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="turnover"> 高周转率驱动（运营效率高）</label>' +
            '<label style="font-size:14px;cursor:pointer;"><input type="radio" name="rw-judge" value="leverage"> 高杠杆驱动（借钱多，风险大）</label>' +
          '</div>';

      default: return '';
    }
  }

  /** 提交实战层答案 */
  window.submitRealWorld = function(kpId) {
    if (!selectedCompany) {
      alert('请先选择一家公司');
      return;
    }

    var kp = findKpDef(kpId);
    if (!kp) return;

    var judgeEl = document.querySelector('input[name="rw-judge"]:checked');
    var judge = judgeEl ? judgeEl.value : null;
    if (!judge) { alert('请选择一个判断'); return; }

    var allCorrect = true;

    // 数据驱动路径
    var strategy = COMPUTATION_REGISTRY[kp.trainingStrategy];
    if (kp.training && kp.training.realWorld && strategy && strategy.type !== 'judgment' && strategy.getRealWorldExpected) {
      var company = AppData.COMPANY_CASES[selectedCompany];
      if (company) {
        var userInputs = collectRealWorldInputs(strategy);
        var expected = strategy.getRealWorldExpected(company.data);
        var result = strategy.validateAnswers(userInputs, expected);
        allCorrect = allTrue(result);
      }
    }
    // judgment 类型：直接通过

    var resultHtml = '';
    if (allCorrect) {
      resultHtml = '<div class="training-result correct">🏆 实战通过！你成功运用' + kp.name + '分析了一家真实公司。<br>' +
        '这份能力已计入你的投资能力画像。</div>';
      AppData.markLevelCompleted(kpId, 'real_world', {
        selected_company: selectedCompany,
        judge: judge,
        attempts: (kp._rwAttempts || 0) + 1,
        completedAt: new Date().toISOString()
      });
      setTimeout(function() {
        alert('恭喜！' + kp.name + ' 4层训练全部完成！🎉\n你的能力画像已更新。');
        closeTrainingModal();
        if (typeof updateAbilityProfile === 'function') updateAbilityProfile();
      }, 1500);
    } else {
      kp._rwAttempts = (kp._rwAttempts || 0) + 1;
      resultHtml = '<div class="training-result wrong">✗ 部分答案有误，请检查</div>';
    }

    var rwResultEl = document.getElementById('rwResult');
    if (rwResultEl) rwResultEl.innerHTML = resultHtml;

    // @deprecated 回退逻辑（如果用了旧版 selectCompany 渲染，走旧版验证）
    if (!kp.training || !kp.training.realWorld) {
      var expected = kp.realWorldExpected ? kp.realWorldExpected[selectedCompany] : null;
      if (!expected) return;

      allCorrect = true;
      switch (kpId) {
        case 'owner-earnings':
          allCorrect = checkVal('rw-earnings', val('rw-earnings'), expected.earnings) &&
                       checkVal('rw-ratio', valFloat('rw-ratio'), expected.ratio);
          break;
        case 'dcf-model':
          allCorrect = checkVal('rw-pvsum', val('rw-pvsum'), expected.pvSum);
          break;
        case 'roe-decomposition':
          allCorrect = checkVal('rw-netMargin', valFloat('rw-netMargin'), expected.netMargin) &&
                       checkVal('rw-turnover', valFloat('rw-turnover'), expected.turnover) &&
                       checkVal('rw-leverage', valFloat('rw-leverage'), expected.leverage) &&
                       checkVal('rw-roe', valFloat('rw-roe'), expected.roe);
          break;
      }

      if (allCorrect) {
        resultHtml = '<div class="training-result correct">🏆 实战通过！</div>';
        AppData.markLevelCompleted(kpId, 'real_world', {
          selected_company: selectedCompany,
          judge: judge,
          completedAt: new Date().toISOString()
        });
        setTimeout(function() {
          alert('恭喜！' + kp.name + ' 4层训练全部完成！🎉');
          closeTrainingModal();
          if (typeof updateAbilityProfile === 'function') updateAbilityProfile();
        }, 1500);
      } else {
        resultHtml = '<div class="training-result wrong">✗ 部分答案有误，请检查</div>';
      }
      if (rwResultEl) rwResultEl.innerHTML = resultHtml;
    }
  };

  /** 从 DOM 收集实战层用户输入 */
  function collectRealWorldInputs(strategy) {
    var user = {};
    if (strategy.type === 'linear') {
      user.earnings = val('rw-earnings');
      user.final = val('rw-earnings');
      user.margin = valFloat('rw-margin');
    } else if (strategy.type === 'iterative') {
      user.pvSum = val('rw-pvsum');
    } else if (strategy.type === 'factor') {
      user.netMargin = valFloat('rw-netMargin');
      user.turnover = valFloat('rw-turnover');
      user.leverage = valFloat('rw-leverage');
      user.roe = valFloat('rw-roe');
    }
    return user;
  }

  // ==================== 层级推进 ====================
  function advanceLevel(kpId) {
    if (currentLevelIdx < LEVEL_KEYS.length - 1) {
      currentLevelIdx++;
      renderTraining();
    } else {
      // 全部 4 层完成
      if (typeof window.analytics !== 'undefined') {
        var kpDef = findKpDef(kpId);
        window.analytics.track('training_completed', {
          kp_id: kpId,
          kp_name: kpDef ? kpDef.name : kpId,
          domain: kpDef ? kpDef.domain : ''
        });
      }
      alert('全部4层训练完成！🎉');
      closeTrainingModal();
      if (typeof updateAbilityProfile === 'function') updateAbilityProfile();
    }
  }

  /** 完成当前层级（概念层、引导层一键完成） */
  window.completeLevel = function(kpId, levelName) {
    AppData.markLevelCompleted(kpId, levelName, { completedAt: new Date().toISOString() });
    // 追踪层完成
    if (typeof window.analytics !== 'undefined') {
      window.analytics.track('training_level_completed', { kp_id: kpId, level: levelName });
    }
    advanceLevel(kpId);
  };

  // ==================== 键盘支持 ====================
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('trainingModal');
      if (modal && !modal.hidden) closeTrainingModal();
    }
  });

})();

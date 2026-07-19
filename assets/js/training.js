/**
 * AI精读笔记 — 投资技能训练场
 * 
 * 为每个知识点提供4层递进训练：概念层 → 引导层 → 练习层 → 实战层
 * 进度自动写入 ability_profile localStorage，驱动能力画像雷达图。
 * 
 * 依赖：data.js（KNOWLEDGE_POINTS, COMPANY_CASES, AppData API）
 */
(function() {
  'use strict';

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
    for (var i = 0; i < AppData.KNOWLEDGE_POINTS.length; i++) {
      if (AppData.KNOWLEDGE_POINTS[i].id === kpId) return AppData.KNOWLEDGE_POINTS[i];
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
    document.getElementById('trainingFooter').innerHTML =
      '<div class="kp-source" style="text-align:center;padding-top:16px;">' +
      '来源：《' + (AppData.getBook(kp.book) && AppData.getBook(kp.book).title || '') +
      '》' + kp.chapterRef + '</div>';
  }

  // ==================== 概念层 ====================
  function renderConceptLevel(kp) {
    var html =
      '<div class="concept-formula">' + kp.formulaDisplay + '</div>' +
      '<div class="concept-description">' + kp.description + '</div>' +
      '<ul class="concept-key-points">' + getConceptKeyPoints(kp.id).map(function(p) {
        return '<li>' + p + '</li>';
      }).join('') + '</ul>' +
      '<div style="text-align:center">' +
        '<button class="training-submit-btn" onclick="completeLevel(\'' + currentKpId + '\',\'concept\')">我已理解 ✓</button>' +
      '</div>';
    document.getElementById('trainingContent').innerHTML = html;
  }

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
    var caseKey = kp.guidedCase;
    var company = AppData.COMPANY_CASES[caseKey];
    if (!company) return;

    var html = '<div class="practice-company-card">' +
      '<div class="company-name">📊 案例公司：' + company.name + ' (' + company.year + '年报)</div>' +
      '<div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">' +
      formatCompanyData(company) +
      '</div></div>';

    // 逐步计算展示
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
        // 永续价值简化
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
    var caseKey = kp.practiceCase;
    var company = AppData.COMPANY_CASES[caseKey];
    if (!company) return;

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

    var expected = kp.practiceExpected;
    var userInputs = {};
    var allCorrect = true;
    var resultHtml = '';

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
      // 自动完成该层
      AppData.markLevelCompleted(kpId, 'practice', { attempts: 1 });
      setTimeout(function() { advanceLevel(kpId); }, 1500);
    }

    document.getElementById('practiceResult').innerHTML = resultHtml;
  };

  function val(id) { return parseInt(document.getElementById(id).value) || 0; }
  function valFloat(id) { return parseFloat(document.getElementById(id).value) || 0; }

  function checkVal(fieldId, userVal, expectedVal) {
    var el = document.getElementById(fieldId);
    if (!el) return false;
    var correct = withinTolerance(userVal, expectedVal, 0.05);
    el.className = 'practice-input' + (correct ? ' correct' : ' wrong');
    return correct;
  }

  function withinTolerance(user, expected, tolerance) {
    if (expected === 0) return user === 0;
    return Math.abs(user - expected) / Math.abs(expected) <= tolerance;
  }

  // ==================== 实战层 ====================
  function renderRealWorldLevel(kp) {
    var companies = kp.realWorldCompanies;
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

    // 选中公司后展开
    html += '<div id="rwDetail"></div>';
    document.getElementById('trainingContent').innerHTML = html;
  }

  /** 选择实战层公司 */
  window.selectCompany = function(kpId, companyKey) {
    selectedCompany = companyKey;

    // 高亮选中卡片
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

    var expected = kp.realWorldExpected[selectedCompany];
    if (!expected) return;

    var allCorrect = true;
    var resultHtml = '';

    switch (kpId) {
      case 'owner-earnings':
        var earnings = val('rw-earnings');
        var ratio = valFloat('rw-ratio');
        allCorrect = checkVal('rw-earnings', earnings, expected.earnings) &&
                     checkVal('rw-ratio', ratio, expected.ratio);
        break;

      case 'dcf-model':
        var pvSum = val('rw-pvsum');
        allCorrect = checkVal('rw-pvsum', pvSum, expected.pvSum);
        break;

      case 'roe-decomposition':
        allCorrect = checkVal('rw-netMargin', valFloat('rw-netMargin'), expected.netMargin) &&
                     checkVal('rw-turnover', valFloat('rw-turnover'), expected.turnover) &&
                     checkVal('rw-leverage', valFloat('rw-leverage'), expected.leverage) &&
                     checkVal('rw-roe', valFloat('rw-roe'), expected.roe);
        break;
    }

    var judgeEl = document.querySelector('input[name="rw-judge"]:checked');
    var judge = judgeEl ? judgeEl.value : null;
    if (!judge) allCorrect = false;

    if (allCorrect) {
      resultHtml = '<div class="training-result correct">🏆 实战通过！你成功运用' + kp.name + '分析了一家真实公司。<br>' +
        '这份能力已计入你的投资能力画像。</div>';
      AppData.markLevelCompleted(kpId, 'real_world', {
        selected_company: selectedCompany,
        judge: judge
      });
      setTimeout(function() {
        alert('恭喜！' + kp.name + ' 4层训练全部完成！🎉\n你的能力画像已更新。');
        closeTrainingModal();
        // 刷新 my.html 面板（如果在 my 页）
        if (typeof updateAbilityProfile === 'function') updateAbilityProfile();
      }, 1500);
    } else {
      var expStr = '';
      Object.keys(expected).forEach(function(k) {
        expStr += k + '=' + expected[k] + ' ';
      });
      resultHtml = '<div class="training-result wrong">✗ 部分答案有误，请检查<br>' +
        '期望：' + expStr + '（允许5%误差）</div>';
    }

    document.getElementById('rwResult').innerHTML = resultHtml;
  };

  // ==================== 层级推进 ====================
  function advanceLevel(kpId) {
    if (currentLevelIdx < LEVEL_KEYS.length - 1) {
      currentLevelIdx++;
      renderTraining();
    } else {
      // 全部完成
      alert('全部4层训练完成！🎉');
      closeTrainingModal();
      if (typeof updateAbilityProfile === 'function') updateAbilityProfile();
    }
  }

  /** 完成当前层级（概念层、引导层一键完成） */
  window.completeLevel = function(kpId, levelName) {
    AppData.markLevelCompleted(kpId, levelName);
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

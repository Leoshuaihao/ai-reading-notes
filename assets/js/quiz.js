/**
 * 自测系统 — 纯前端渲染 + 校验引擎
 * 
 * 职责：
 * 1. 页面加载时读取 window.CHAPTER_QUIZZES
 * 2. 查找 .self-quiz 元素，读取 data-book / data-chapter
 * 3. 渲染题目到 .quiz-body 中
 * 4. 用户答题后即时反馈（正确/错误 + 解析）
 * 5. localStorage 记录答题结果
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'chapter_quizzes';

  /**
   * 查找页面上所有 .self-quiz 元素并初始化
   */
  function initQuiz() {
    var containers = document.querySelectorAll('.self-quiz');
    if (!containers.length) return;

    var quizzes = window.CHAPTER_QUIZZES;
    if (!quizzes) return;

    containers.forEach(function(container) {
      var book = container.getAttribute('data-book');
      var chapter = parseInt(container.getAttribute('data-chapter'), 10);
      if (!book || !chapter) return;

      var bookQuizzes = quizzes[book];
      if (!bookQuizzes || !bookQuizzes[chapter]) return;

      var chapterQuizzes = bookQuizzes[chapter];
      var body = container.querySelector('.quiz-body');
      if (!body) return;

      chapterQuizzes.forEach(function(quiz, index) {
        renderQuizCard(body, quiz, index, book, chapter);
      });

      // 移除 hidden 属性，因为现在有内容了（但折叠状态仍由 header onclick 控制）
    });
  }

  /**
   * 渲染单个题目卡片
   */
  function renderQuizCard(container, quiz, index, book, chapter) {
    var saved = loadResult(book, chapter, index);
    var wrapper = document.createElement('div');
    wrapper.className = 'quiz-item';
    wrapper.style.cssText = 'margin:12px 0;padding:16px;background:var(--card-bg, #fff);border-radius:8px;border:1px solid var(--border-color, #e0e0e0);';

    // 题目标题
    var qLabel = document.createElement('div');
    qLabel.style.cssText = 'font-weight:600;margin-bottom:10px;color:var(--text-primary, #333);font-size:15px;';
    qLabel.textContent = (index + 1) + '. ' + quiz.q;
    wrapper.appendChild(qLabel);

    // 选项区域
    var optionsDiv = document.createElement('div');
    optionsDiv.className = 'quiz-options';
    optionsDiv.style.cssText = 'margin-bottom:10px;';

    if (quiz.type === 'single') {
      quiz.options.forEach(function(opt, optIdx) {
        var label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;padding:8px 12px;margin:4px 0;border-radius:6px;cursor:pointer;transition:background 0.15s;border:1px solid transparent;';
        label.onmouseenter = function() { if (!label.dataset.disabled) label.style.background = 'var(--tag-bg, #f5f5f5)'; };
        label.onmouseleave = function() { if (!label.dataset.disabled) label.style.background = 'transparent'; };

        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'quiz-' + book + '-' + chapter + '-' + index;
        radio.value = optIdx;
        radio.style.marginRight = '8px';
        label.appendChild(radio);

        var text = document.createElement('span');
        text.textContent = opt;
        label.appendChild(text);

        if (saved) {
          label.dataset.disabled = '1';
          radio.disabled = true;
          label.style.cursor = 'default';
          label.style.opacity = '0.7';
        }

        optionsDiv.appendChild(label);
      });
    } else if (quiz.type === 'judge') {
      ['正确', '错误'].forEach(function(opt, optIdx) {
        var boolVal = optIdx === 0; // 正确 → true, 错误 → false
        var label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;padding:8px 12px;margin:4px 0;border-radius:6px;cursor:pointer;transition:background 0.15s;border:1px solid transparent;';
        label.onmouseenter = function() { if (!label.dataset.disabled) label.style.background = 'var(--tag-bg, #f5f5f5)'; };
        label.onmouseleave = function() { if (!label.dataset.disabled) label.style.background = 'transparent'; };

        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'quiz-' + book + '-' + chapter + '-' + index;
        radio.value = boolVal;
        radio.style.marginRight = '8px';
        label.appendChild(radio);

        var text = document.createElement('span');
        text.textContent = opt;
        label.appendChild(text);

        if (saved) {
          label.dataset.disabled = '1';
          radio.disabled = true;
          label.style.cursor = 'default';
          label.style.opacity = '0.7';
        }

        optionsDiv.appendChild(label);
      });
    } else if (quiz.type === 'calc') {
      var inputWrap = document.createElement('div');
      inputWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';

      var input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.placeholder = '输入你的计算结果...';
      input.style.cssText = 'flex:1;padding:8px 12px;border:1px solid var(--border-color, #ddd);border-radius:6px;font-size:14px;';
      inputWrap.appendChild(input);

      if (saved) {
        input.disabled = true;
        input.style.opacity = '0.7';
      }

      optionsDiv.appendChild(inputWrap);
    }

    wrapper.appendChild(optionsDiv);

    // 提交按钮
    if (!saved) {
      var submitBtn = document.createElement('button');
      submitBtn.textContent = '提交答案';
      submitBtn.style.cssText = 'padding:6px 16px;background:var(--accent, #2196F3);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;';
      submitBtn.onclick = function() {
        var userAnswer = getUserAnswer(wrapper, quiz);
        if (userAnswer === null) {
          shakeElement(submitBtn);
          return;
        }
        handleSubmit(wrapper, quiz, userAnswer, book, chapter, index);
      };
      wrapper.appendChild(submitBtn);
    }

    // 如果之前答过，显示历史结果
    if (saved) {
      showResult(wrapper, saved.correct, quiz.explanation, quiz);
    }

    container.appendChild(wrapper);
  }

  /**
   * 获取用户答案
   */
  function getUserAnswer(wrapper, quiz) {
    if (quiz.type === 'single' || quiz.type === 'judge') {
      var checked = wrapper.querySelector('input[type="radio"]:checked');
      if (!checked) return null;
      var val = checked.value;
      if (quiz.type === 'judge') {
        return val === 'true';
      }
      return parseInt(val, 10);
    } else if (quiz.type === 'calc') {
      var input = wrapper.querySelector('input[type="number"]');
      if (!input || input.value === '') return null;
      return parseFloat(input.value);
    }
    return null;
  }

  /**
   * 校验答案
   */
  function checkAnswer(quiz, userAnswer) {
    var correct = false;
    if (quiz.type === 'single') {
      correct = userAnswer === quiz.answer;
    } else if (quiz.type === 'judge') {
      correct = userAnswer === quiz.answer;
    } else if (quiz.type === 'calc') {
      // 误差在 5% 以内算正确
      correct = Math.abs(userAnswer - quiz.answer) / Math.abs(quiz.answer) <= 0.05;
    }
    return { correct: correct, explanation: quiz.explanation };
  }

  /**
   * 提交处理
   */
  function handleSubmit(wrapper, quiz, userAnswer, book, chapter, index) {
    var result = checkAnswer(quiz, userAnswer);

    // 禁用所有选项
    var inputs = wrapper.querySelectorAll('input');
    inputs.forEach(function(inp) { inp.disabled = true; });
    var labels = wrapper.querySelectorAll('label');
    labels.forEach(function(l) { l.style.cursor = 'default'; l.style.opacity = '0.7'; });

    // 移除提交按钮
    var btn = wrapper.querySelector('button');
    if (btn) btn.remove();

    // 显示结果
    showResult(wrapper, result.correct, result.explanation, quiz);

    // 保存结果
    saveResult(book, chapter, index, result.correct, quiz.kpId);
  }

  /**
   * 显示答题结果
   */
  function showResult(wrapper, correct, explanation, quiz) {
    var resultDiv = document.createElement('div');
    resultDiv.style.cssText = 'margin-top:10px;padding:12px;border-radius:6px;font-size:14px;line-height:1.6;';

    if (correct) {
      resultDiv.style.background = '#e8f5e9';
      resultDiv.style.color = '#2e7d32';
      resultDiv.innerHTML = '✅ <strong>【正确】</strong> ' + explanation;
    } else {
      resultDiv.style.background = '#fce4ec';
      resultDiv.style.color = '#c62828';
      var answerText = '';
      if (quiz.type === 'single') {
        answerText = '正确答案：' + quiz.options[quiz.answer];
      } else if (quiz.type === 'judge') {
        answerText = '正确答案：' + (quiz.answer ? '正确' : '错误');
      } else if (quiz.type === 'calc') {
        answerText = '正确答案：' + quiz.answer;
      }
      resultDiv.innerHTML = '❌ <strong>【错误】</strong> ' + answerText + '<br>' + explanation;
    }

    wrapper.appendChild(resultDiv);
  }

  /**
   * 保存结果到 localStorage
   */
  function saveResult(book, chapter, index, correct, kpId) {
    var key = book + '_' + chapter + '_' + index;
    var data = loadAllResults();
    data[key] = {
      correct: correct,
      kpId: kpId || '',
      at: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage 不可用或满，静默失败
    }
  }

  /**
   * 读取单个结果
   */
  function loadResult(book, chapter, index) {
    var key = book + '_' + chapter + '_' + index;
    var data = loadAllResults();
    return data[key] || null;
  }

  /**
   * 读取全部结果
   */
  function loadAllResults() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * 无答案时晃动按钮提示
   */
  function shakeElement(el) {
    el.style.transition = 'transform 0.1s';
    el.style.transform = 'translateX(-4px)';
    setTimeout(function() { el.style.transform = 'translateX(4px)'; }, 100);
    setTimeout(function() { el.style.transform = 'translateX(-3px)'; }, 200);
    setTimeout(function() { el.style.transform = 'translateX(3px)'; }, 300);
    setTimeout(function() { el.style.transform = 'translateX(0)'; }, 400);
  }

  // 页面加载时自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuiz);
  } else {
    initQuiz();
  }
})();

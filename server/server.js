const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// 静态文件服务 - 项目根目录
app.use(express.static(path.join(__dirname, '..')));

// ==================== 预计算诊断报告 ====================
let DIAGNOSE_REPORTS = {};
try {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'engine', 'precomputed_reports.json'), 'utf8');
  DIAGNOSE_REPORTS = JSON.parse(raw);
  console.log(`[diagnose] 已加载 ${Object.keys(DIAGNOSE_REPORTS).length} 份预计算报告`);
} catch (e) {
  console.warn('[diagnose] 预计算报告加载失败:', e.message);
}

// ==================== API: 股票诊断 ====================
app.post('/api/diagnose', express.json(), (req, res) => {
  const { stock_code } = req.body || {};
  if (!stock_code || typeof stock_code !== 'string') {
    return res.status(400).json({ error: 'empty_code', message: '请输入股票代码' });
  }

  const code = stock_code.trim();
  const report = DIAGNOSE_REPORTS[code];
  if (!report) {
    const supported = Object.keys(DIAGNOSE_REPORTS);
    return res.status(404).json({
      error: 'not_found',
      message: `暂不支持该股票。当前支持：${supported.join('、')}`,
      supported,
    });
  }

  res.json(report);
});

// ==================== API: 支持的股票列表 ====================
app.get('/api/stocks', (req, res) => {
  const stocks = Object.values(DIAGNOSE_REPORTS).map(r => ({
    code: r.stock.code,
    name: r.stock.name,
    industry: r.stock.industry,
    score: r.total_score,
    max_score: r.max_score,
  }));
  res.json({ stocks });
});

// ==================== API: DeepSeek 聊天代理 ====================
app.post('/api/chat', express.json(), async (req, res) => {
  try {
    const { messages, model = 'deepseek-chat', temperature = 0.7, max_tokens = 600 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages参数必填' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key未配置' });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, stream: false }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Chat API Error:', error.message);
    res.status(500).json({ error: '服务器错误', message: error.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', stocks: Object.keys(DIAGNOSE_REPORTS).length });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

/**
 * AI 精读笔记 — Cloudflare Workers API 代理
 * 职责：转发请求到 DeepSeek API、API Key 管理、速率限制、CORS
 *
 * 设计：纯转发模式。前端 chat.js 已构建好 messages（含 system prompt），
 * Worker 只负责密钥管理、速率限制、CORS、超时控制。
 */

// ==================== 配置 ====================
const DEEPSEEK_BASE = 'https://api.deepseek.com';
const REQUEST_TIMEOUT = 15000; // 15秒超时

// ==================== 速率限制（内存存储） ====================
const rateLimitMap = new Map();

function cleanRateLimitMap() {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap) {
    const valid = timestamps.filter(t => now - t < 60000);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}
setInterval(cleanRateLimitMap, 300000);

function checkRateLimit(ip) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const valid = timestamps.filter(t => now - t < 60000);
  rateLimitMap.set(ip, valid);

  if (valid.length >= 30) {
    return false; // 每分钟最多30条
  }
  valid.push(now);
  rateLimitMap.set(ip, valid);
  return true;
}

// ==================== CORS ====================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ==================== 处理聊天请求（纯转发） ====================
async function handleChatRequest(request, env) {
  // 速率限制
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(ip)) {
    return jsonResponse({
      error: 'rate_limited',
      message: '请求太频繁，请稍后再试（每分钟最多30条）',
    }, 429);
  }

  // 解析请求体（OpenAI 格式：{ messages, model, max_tokens, temperature }）
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_json', message: '请求格式错误' }, 400);
  }

  const { messages, model = 'deepseek-chat', max_tokens = 600, temperature = 0.7 } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: 'empty_messages', message: 'messages 参数必填' }, 400);
  }

  // 检查 API Key
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return jsonResponse({
      error: 'config_error',
      message: 'API 配置未完成，请联系管理员',
    }, 500);
  }

  // 转发到 DeepSeek API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const resp = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('DeepSeek API error:', resp.status, errText);
      return jsonResponse({
        error: 'api_error',
        message: 'AI 服务暂时不可用，请稍后再试',
        status: resp.status,
      }, 502);
    }

    const data = await resp.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return jsonResponse({
        error: 'empty_response',
        message: 'AI 暂时无法生成回复，请换个角度再问一次',
      });
    }

    // 直接返回 OpenAI 格式（前端 chat.js 期望 data.choices[0].message.content）
    return jsonResponse(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return jsonResponse({
        error: 'timeout',
        message: '⏱️ 响应较慢，请稍候或稍后再试',
      }, 504);
    }
    console.error('Worker error:', err.message);
    return jsonResponse({
      error: 'internal_error',
      message: '服务内部错误，请稍后再试',
    }, 500);
  }
}

// ==================== 入口 ====================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // 健康检查
    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok', timestamp: Date.now() });
    }

    // API 聊天端点
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const response = await handleChatRequest(request, env);
      return withCors(response);
    }

    // 404
    return jsonResponse({ error: 'not_found' }, 404);
  },
};

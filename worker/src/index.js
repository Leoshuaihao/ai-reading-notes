/**
 * AI 精读笔记 — Cloudflare Workers API 代理
 * 职责：转发请求到 DeepSeek API、API Key 管理、速率限制、CORS
 */

// ==================== 配置 ====================
const DEEPSEEK_BASE = 'https://api.deepseek.com';
const MODEL = 'deepseek-chat';
const MAX_TOKENS = 600;
const TEMPERATURE = 0.7;
const REQUEST_TIMEOUT = 15000; // 15秒超时

// ==================== 速率限制（内存存储） ====================
const rateLimitMap = new Map();

// 清理过期记录（每5分钟）
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

// ==================== System Prompt 模板 ====================
function buildSystemPrompt(chapterTitle, chapterId, book, author) {
  return `你是一位投资导师，扮演${author}（《${book}》作者）的角色。
你正在与一位中文读者讨论书中的思考题。

原则：
1. 先用苏格拉底式提问引导读者说出自己的想法，不要直接给答案
2. 当读者表达观点后，引用书中的相关原文来深化讨论
3. 使用通俗的中文，偶尔保留关键英文术语
4. 语气温和但有挑战性——像一位严厉但关心你的导师
5. 每次回复控制在150字以内，聚焦一个点

当前上下文：
- 书籍：《${book}》by ${author}
- 章节：${chapterTitle}
- 这是第${chapterId}章的讨论

如果用户问的问题与投资完全无关或涉及敏感话题，请礼貌地表示你只能讨论本书相关的投资话题。`;
}

// ==================== 处理请求 ====================
async function handleChatRequest(request, env, ctx) {
  // 速率限制
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({
      error: 'rate_limited',
      message: '请求太频繁，请稍后再试（每分钟最多30条）'
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 解析请求体
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { message, chapter_id, chapter_title, conversation_history } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'empty_message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 构建消息
  const book = body.book || 'Common Stocks and Uncommon Profits';
  const author = body.author || 'Philip A. Fisher';
  const chTitle = chapter_title || '未知章节';
  const chId = chapter_id || 'unknown';

  const systemPrompt = buildSystemPrompt(chTitle, chId, book, author);

  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // 添加历史对话（最多10轮=20条消息）
  if (Array.isArray(conversation_history)) {
    const recent = conversation_history.slice(-20);
    messages.push(...recent);
  }

  messages.push({ role: 'user', content: message.trim() });

  // 调用 DeepSeek API
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'config_error',
      message: 'API 配置未完成，请联系管理员'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

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
        model: MODEL,
        messages: messages,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('DeepSeek API error:', resp.status, errText);
      return new Response(JSON.stringify({
        error: 'api_error',
        message: 'AI 服务暂时不可用，请稍后再试',
        status: resp.status,
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await resp.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return new Response(JSON.stringify({
        error: 'empty_response',
        message: 'AI 暂时无法生成回复，请换个角度再问一次'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      reply: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    if (err.name === 'AbortError') {
      return new Response(JSON.stringify({
        error: 'timeout',
        message: '⏱️ 响应较慢，请稍候或稍后再试'
      }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error('Worker error:', err.message);
    return new Response(JSON.stringify({
      error: 'internal_error',
      message: '服务内部错误，请稍后再试'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ==================== CORS 预检 ====================
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

function addCorsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ==================== 入口 ====================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // 健康检查
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API 聊天端点
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const response = await handleChatRequest(request, env, ctx);
      return addCorsHeaders(response);
    }

    // 404
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

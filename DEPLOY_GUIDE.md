# AI 对话部署指引

> 当前状态：**模拟模式**（每本书有对应作者人设的模拟回复，体验已可用）
> 目标状态：**真实 DeepSeek API**（接入大模型，深度对话）
> 切换条件：获取有效 DeepSeek API key + 部署 Cloudflare Worker

---

## 一、前置条件

1. **DeepSeek API key**：到 https://platform.deepseek.com/ 注册并创建 API key（格式 `sk-xxxxxxxx`）
2. **Cloudflare 账号**：到 https://dash.cloudflare.com/sign-up 注册（免费）
3. **wrangler CLI**：`npm install -g wrangler` 或 `npx wrangler`

---

## 二、部署 Cloudflare Worker（推荐方案）

### 步骤 1：登录 Cloudflare

```bash
cd worker
npx wrangler login
```

浏览器会打开 Cloudflare 授权页，点击"Allow"。

### 步骤 2：部署 Worker

```bash
cd worker
npx wrangler deploy
```

部署成功后，wrangler 会输出一个 URL，形如：
```
https://ai-reading-api-proxy.<你的子域>.workers.dev
```

**记下这个 URL**，下一步要用。

### 步骤 3：配置 DeepSeek API Key（secret）

```bash
cd worker
npx wrangler secret put DEEPSEEK_API_KEY
```

命令行会提示输入值，粘贴你的 DeepSeek API key（`sk-xxxxxxxx`）并回车。

### 步骤 4：验证 Worker

```bash
curl https://ai-reading-api-proxy.<你的子域>.workers.dev/health
# 期望返回：{"status":"ok","timestamp":...}

curl -X POST https://ai-reading-api-proxy.<你的子域>.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}],"max_tokens":50}'
# 期望返回 DeepSeek 的真实回复
```

---

## 三、启用真实 API

修改 `assets/js/chat.js` 第 11-17 行：

```js
// 第 11 行：填入你的 Worker 地址
var WORKER_URL = 'https://ai-reading-api-proxy.<你的子域>.workers.dev';

// 第 17 行：改为 true
var USE_REAL_API = true;
```

然后提交推送：

```bash
git add assets/js/chat.js
git commit -m "feat: 启用真实 DeepSeek AI 对话"
git push
```

GitHub Pages 更新后（约 1-2 分钟），所有书页的 AI 对话将从模拟模式切换为真实 DeepSeek API。

---

## 四、验证

1. 打开任意书页，如 https://ai-reading.workbuddy.com/books/principles/
2. 找到思考题，点击"💬 跟AI讨论这道题"
3. 输入消息，确认收到的是**非模板化**的真实 AI 回复（模拟回复是固定几条循环，真实回复每次不同）

---

## 五、备选方案：Railway

如果 Cloudflare 不可用，可用 Railway 部署 `server/server.js`（同时提供 AI 对话 + 股票诊断两个 API）：

1. 到 https://railway.app 用 GitHub 登录
2. New Project → Deploy from GitHub repo → 选择 `ai-reading-notes`
3. Railway 自动检测 `railway.json` 并部署
4. 在 Railway 的 Variables 里添加 `DEEPSEEK_API_KEY=sk-xxxxxxxx`
5. 部署成功后拿到 URL（如 `https://xxx.up.railway.app`）
6. 修改 `assets/js/chat.js`：
   - `WORKER_URL = 'https://xxx.up.railway.app'`
   - `USE_REAL_API = true`
7. 修改 `diagnose.html` 第 202 行：
   - `window.DIAGNOSE_API = 'https://xxx.up.railway.app'`

Railway 方案额外提供 `/api/diagnose`（股票诊断后端），Cloudflare Worker 方案只提供 `/api/chat`（诊断走前端 JSON 降级）。

---

## 六、成本说明

- **DeepSeek API**：deepseek-chat 模型，约 ¥1/百万 token（输入）+ ¥8/百万 token（输出）。单次对话约 500 token，成本约 ¥0.005。每日 20 轮/用户，月成本约 ¥3/活跃用户。
- **Cloudflare Workers**：免费额度 10 万次/天，足够中小规模使用。
- **Railway**：免费额度 $5/月，足够 MVP 阶段。

---

## 七、当前架构

```
用户浏览器
  ├── 书页 AI 对话 → chat.js → [模拟模式 / Worker代理 → DeepSeek API]
  ├── 股票诊断 → diagnose.html → [前端JSON降级7只 / server.js → 预计算报告]
  └── 静态资源 → GitHub Pages（ai-reading.workbuddy.com）

部署后：
  ├── 书页 AI 对话 → chat.js → Worker(server) → DeepSeek API
  └── 股票诊断 → diagnose.html → server.js → 7只预计算 + 任意股票
```

---

## 八、故障排查

| 问题 | 原因 | 解决 |
|------|------|------|
| AI 回复是模板化的 | `USE_REAL_API = false` | 改为 `true` |
| `config_error` | Worker 的 DEEPSEEK_API_KEY 未设 | `wrangler secret put DEEPSEEK_API_KEY` |
| `rate_limited` | 超过 30 条/分钟 | 等待 1 分钟 |
| `timeout` | DeepSeek 响应慢 | 重试或增大 REQUEST_TIMEOUT |
| CORS 错误 | Worker 未配置 CORS | 检查 worker/src/index.js 的 CORS_HEADERS |
| 诊断只支持 7 只 | 走前端 JSON 降级 | 部署 server.js 获得完整诊断 |

// Минимальный сервер «Иммунитета» без зависимостей (Node 18+).
// Отдаёт dist/ и проксирует запросы к ИИ: ключ живёт только здесь, во фронтенд он не попадает.
//
//   LLM_PROVIDER=anthropic  ANTHROPIC_API_KEY=...  [ANTHROPIC_MODEL_QUICK=claude-haiku-5-5] [ANTHROPIC_MODEL=claude-sonnet-5-5]
//   LLM_PROVIDER=openai     LLM_BASE_URL=https://…/v1  LLM_API_KEY=...  LLM_MODEL=...   (любой OpenAI-совместимый API)
//   PORT=8080
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// .env в корне проекта (если есть): KEY=value, строки с # — комментарии; уже заданные переменные не перезаписываются
const ENV = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(ENV)) for (const line of readFileSync(ENV, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = +process.env.PORT || 8080;
const PROVIDER = process.env.LLM_PROVIDER || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.LLM_BASE_URL ? 'openai' : '');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const LIMITS = { bodyBytes: 16e6, messages: 40, chars: 60000, images: 2, imageB64: 8e6, perMinute: 20 };

/* ---------- провайдеры: вход {messages, images, tier} → текст ---------- */
const providers = {
  async anthropic({ messages, images, tier }) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw httpErr(503, 'no_key');
    const model = tier === 'quick' ? (process.env.ANTHROPIC_MODEL_QUICK || 'claude-haiku-5-5') : (process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5');
    const msgs = messages.map(m => ({ role: m.role, content: m.content }));
    if (images.length) { // картинки — к последнему сообщению пользователя
      const last = msgs.at(-1);
      last.content = [...images.map(i => ({ type: 'image', source: { type: 'base64', media_type: i.media_type, data: i.data } })), { type: 'text', text: String(last.content) }];
    }
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 1600, messages: msgs }),
    });
    if (r.status === 429) throw httpErr(429, 'rate_limited');
    if (!r.ok) throw httpErr(502, 'upstream_' + r.status);
    const j = await r.json();
    return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  },
  async openai({ messages, images, tier }) {
    const base = process.env.LLM_BASE_URL, key = process.env.LLM_API_KEY;
    if (!base) throw httpErr(503, 'no_key');
    const model = (tier === 'quick' && process.env.LLM_MODEL_QUICK) || process.env.LLM_MODEL;
    const msgs = messages.map(m => ({ role: m.role, content: m.content }));
    if (images.length) {
      const last = msgs.at(-1);
      last.content = [{ type: 'text', text: String(last.content) }, ...images.map(i => ({ type: 'image_url', image_url: { url: `data:${i.media_type};base64,${i.data}` } }))];
    }
    const r = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) },
      body: JSON.stringify({ model, messages: msgs, max_tokens: 1600 }),
    });
    if (r.status === 429) throw httpErr(429, 'rate_limited');
    if (!r.ok) throw httpErr(502, 'upstream_' + r.status);
    const j = await r.json();
    return j.choices?.[0]?.message?.content || '';
  },
};

/* ---------- вспомогательное ---------- */
function httpErr(status, code) { const e = new Error(code); e.status = status; e.code = code; return e; }
function send(res, status, obj) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); }
const hits = new Map(); // ip → [время запросов]; простой лимит в памяти
function limited(ip) { const now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 60000); a.push(now); hits.set(ip, a); return a.length > LIMITS.perMinute; }
async function readJson(req) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > LIMITS.bodyBytes) throw httpErr(413, 'too_large'); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw httpErr(400, 'bad_json'); }
}
function validate(b) {
  const messages = Array.isArray(b?.messages) ? b.messages : null;
  if (!messages || !messages.length || messages.length > LIMITS.messages) throw httpErr(400, 'bad_messages');
  let chars = 0;
  for (const m of messages) {
    if (!['user', 'assistant'].includes(m?.role) || typeof m.content !== 'string') throw httpErr(400, 'bad_messages');
    chars += m.content.length;
  }
  if (chars > LIMITS.chars) throw httpErr(413, 'too_long');
  if (messages.at(-1).role !== 'user') throw httpErr(400, 'last_must_be_user');
  const images = Array.isArray(b.images) ? b.images : [];
  if (images.length > LIMITS.images) throw httpErr(400, 'too_many_images');
  for (const i of images) if (!/^image\/(jpeg|png|webp|gif)$/.test(i?.media_type) || typeof i.data !== 'string' || i.data.length > LIMITS.imageB64) throw httpErr(400, 'bad_image');
  return { messages, images, tier: b.tier === 'default' ? 'default' : 'quick' };
}

/* ---------- сервер ---------- */
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, ai: !!PROVIDER && (PROVIDER !== 'anthropic' || !!process.env.ANTHROPIC_API_KEY), provider: PROVIDER || null });
    if (url.pathname === '/api/chat') {
      if (req.method !== 'POST') return send(res, 405, { error: 'method' });
      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
      if (limited(ip)) return send(res, 429, { error: 'rate_limited' });
      const input = validate(await readJson(req));
      const p = providers[PROVIDER];
      if (!p) return send(res, 503, { error: 'no_provider' });
      const text = await p(input); // тексты пользователей не логируем
      return send(res, 200, { text });
    }
    // статика
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path.endsWith('/')) path += 'index.html';
    const file = join(ROOT, path);
    if (!file.startsWith(ROOT)) return send(res, 403, { error: 'forbidden' });
    const st = await stat(file).catch(() => null);
    if (!st || !st.isFile()) return send(res, 404, { error: 'not_found' });
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': extname(file) === '.mp3' ? 'public, max-age=604800' : 'no-cache' });
    res.end(await readFile(file));
  } catch (e) {
    if (!e.status) console.error('[server]', e.message);
    send(res, e.status || 500, { error: e.code || 'server_error' });
  }
}).listen(PORT, () => console.log(`Иммунитет: http://localhost:${PORT}  (ИИ: ${PROVIDER || 'не настроен — работает без ИИ'})`));

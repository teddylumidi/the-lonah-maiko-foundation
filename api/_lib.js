// Shared helpers for the LMF site editor API (Vercel serverless functions).
const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'teddylumidi/the-lonah-maiko-foundation';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://thelonahmaikofoundation.com,https://www.thelonahmaikofoundation.com,https://the-lonah-maiko-foundation.vercel.app')
  .split(',').map(s => s.trim());

function cors(req, res) {
  const origin = req.headers.origin || '';
  const ok = ALLOWED_ORIGINS.includes(origin) || /^https:\/\/the-lonah-maiko-foundation[-\w]*\.vercel\.app$/.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
  if (ok) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET not set');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + mac;
}

function verify(token) {
  try {
    const [body, mac] = String(token || '').split('.');
    const want = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(body).digest('base64url');
    if (!mac || mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch (e) { return null; }
}

function auth(req) {
  const h = req.headers.authorization || '';
  return verify(h.replace(/^Bearer\s+/i, ''));
}

async function gh(path, opts = {}) {
  const r = await fetch('https://api.github.com/repos/' + REPO + path, {
    ...opts,
    headers: {
      'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'lmf-site-editor',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {})
    }
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }
  if (!r.ok) { const err = new Error('GitHub ' + r.status + ': ' + (json.message || text)); err.status = r.status; throw err; }
  return json;
}

// Only content files may be written by the editor (these do not trigger a Netlify deploy).
const EDITABLE = new Set(['data/text.json', 'data/images.json', 'data/sections.json', 'data/pages.json', 'data/menu.json', 'data/appeal.json', 'data/news.json']);
function allowedUpload(p) { return /^Images\/uploads\/[\w.-]{1,120}\.(jpe?g|png|webp|gif)$/i.test(p); }

module.exports = { cors, sign, verify, auth, gh, EDITABLE, allowedUpload, REPO, BRANCH };

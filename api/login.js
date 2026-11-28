const crypto = require('crypto');
const { cors, sign } = require('./_lib');

function same(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { username, password } = req.body || {};
  const okUser = same((username || '').trim().toLowerCase(), (process.env.EDITOR_USER || '').toLowerCase());
  const okPass = same(password, process.env.EDITOR_PASSWORD);
  if (!process.env.EDITOR_USER || !process.env.EDITOR_PASSWORD) return res.status(500).json({ error: 'Editor login is not configured yet.' });
  if (!okUser || !okPass) {
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  const token = sign({ u: process.env.EDITOR_USER, exp: Date.now() + 12 * 3600 * 1000 });
  res.status(200).json({ token, name: process.env.EDITOR_NAME || 'Editor' });
};

// Returns the latest editable content straight from GitHub (no cache), for the editor.
const { cors, auth, gh, EDITABLE, BRANCH } = require('./_lib');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (!auth(req)) return res.status(401).json({ error: 'Please log in again.' });
  try {
    const out = {};
    await Promise.all([...EDITABLE].map(async p => {
      try {
        const f = await gh('/contents/' + p + '?ref=' + BRANCH);
        out[p] = JSON.parse(Buffer.from(f.content, 'base64').toString('utf8'));
      } catch (e) { out[p] = null; }
    }));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

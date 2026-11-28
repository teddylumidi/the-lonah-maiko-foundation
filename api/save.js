// Publishes the editor's changes as ONE commit to GitHub.
// Body: { files: { "data/text.json": {...}, ... }, uploads: [{ path: "Images/uploads/x.jpg", base64: "..." }], message }
const { cors, auth, gh, EDITABLE, allowedUpload, BRANCH } = require('./_lib');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const who = auth(req);
  if (!who) return res.status(401).json({ error: 'Please log in again.' });
  const { files = {}, uploads = [], message } = req.body || {};
  try {
    const tree = [];
    for (const [path, value] of Object.entries(files)) {
      if (!EDITABLE.has(path)) return res.status(400).json({ error: 'Not editable: ' + path });
      tree.push({ path, mode: '100644', type: 'blob', content: JSON.stringify(value, null, 2) + '\n' });
    }
    for (const u of uploads) {
      if (!allowedUpload(u.path) || typeof u.base64 !== 'string') return res.status(400).json({ error: 'Bad upload: ' + u.path });
      if (u.base64.length > 6 * 1024 * 1024) return res.status(413).json({ error: 'Photo too large (max ~4 MB).' });
      const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: u.base64, encoding: 'base64' }) });
      tree.push({ path: u.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    if (!tree.length) return res.status(400).json({ error: 'Nothing to publish.' });
    const ref = await gh('/git/ref/heads/' + BRANCH);
    const base = await gh('/git/commits/' + ref.object.sha);
    const newTree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree }) });
    const commit = await gh('/git/commits', { method: 'POST', body: JSON.stringify({
      message: (message || 'Website update from the site editor') + '\n\nEdited by ' + who.u + ' via the LMF site editor',
      tree: newTree.sha, parents: [ref.object.sha]
    }) });
    await gh('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
    res.status(200).json({ ok: true, commit: commit.sha.slice(0, 7) });
  } catch (e) {
    res.status(e.status === 409 || e.status === 422 ? 409 : 500).json({ error: e.status === 422 || e.status === 409 ? 'Someone else saved at the same time. Please press Publish again.' : e.message });
  }
};

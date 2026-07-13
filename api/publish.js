// Vercel serverless function — commits dashboard edits to GitHub so the site redeploys.
// Env vars required (set in Vercel → Project → Settings → Environment Variables):
//   ADMIN_PASSWORD  – the staff dashboard password
//   GITHUB_TOKEN    – a fine-grained PAT with Contents: Read & Write on this repo
//   GITHUB_REPO     – optional, defaults to "maisoninfuze-star/bombay-grill"
//   GITHUB_BRANCH   – optional, defaults to "main"
// The token is never sent to the browser; only this function reads it.

const REPO = process.env.GITHUB_REPO || 'maisoninfuze-star/bombay-grill';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const API = 'https://api.github.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const token = process.env.GITHUB_TOKEN;
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!token || !adminPw) { res.status(500).json({ error: 'Server not configured (missing GITHUB_TOKEN or ADMIN_PASSWORD).' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, overrides, images, manifestJs } = body || {};

  if (!password || !safeEqual(String(password), String(adminPw))) { res.status(401).json({ error: 'Unauthorized' }); return; }
  if (!overrides || typeof overrides !== 'object') { res.status(400).json({ error: 'Missing overrides' }); return; }

  const gh = (path, opts = {}) => fetch(API + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'bombay-grill-admin',
      ...(opts.headers || {}),
    },
  });

  try {
    // 1. current head + base tree
    const refR = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    if (!refR.ok) throw new Error('ref ' + refR.status + ' ' + (await refR.text()).slice(0, 160));
    const headSha = (await refR.json()).object.sha;
    const commitR = await gh(`/repos/${REPO}/git/commits/${headSha}`);
    const baseTree = (await commitR.json()).tree.sha;

    // 2. build tree entries (blobs)
    const tree = [];
    const addText = async (path, content) => {
      const b = await gh(`/repos/${REPO}/git/blobs`, { method: 'POST', body: JSON.stringify({ content, encoding: 'utf-8' }) });
      const j = await b.json();
      if (!b.ok) throw new Error('blob ' + path + ' ' + JSON.stringify(j).slice(0, 160));
      tree.push({ path, mode: '100644', type: 'blob', sha: j.sha });
    };
    const addBinary = async (path, b64) => {
      const b = await gh(`/repos/${REPO}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: b64, encoding: 'base64' }) });
      const j = await b.json();
      if (!b.ok) throw new Error('blob ' + path + ' ' + JSON.stringify(j).slice(0, 160));
      tree.push({ path, mode: '100644', type: 'blob', sha: j.sha });
    };

    await addText('assets/data/overrides.json', JSON.stringify(overrides, null, 1) + '\n');
    if (typeof manifestJs === 'string' && manifestJs.trim()) await addText('assets/js/photo-manifest.js', manifestJs);

    const imgs = Array.isArray(images) ? images : [];
    for (const im of imgs) {
      if (!im || typeof im.path !== 'string' || typeof im.b64 !== 'string') continue;
      if (!/^assets\/photos\/(full|thumb)\/[a-z0-9-]+\.jpg$/i.test(im.path)) continue; // whitelist paths
      await addBinary(im.path, im.b64);
    }

    if (!tree.length) { res.status(400).json({ error: 'Nothing to commit' }); return; }

    // 3. new tree, commit, move ref
    const treeR = await gh(`/repos/${REPO}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: baseTree, tree }) });
    const treeJ = await treeR.json();
    if (!treeR.ok) throw new Error('tree ' + JSON.stringify(treeJ).slice(0, 160));

    const msg = `Dashboard: update menu/photos (${tree.length} file${tree.length > 1 ? 's' : ''})`;
    const newCommitR = await gh(`/repos/${REPO}/git/commits`, { method: 'POST', body: JSON.stringify({ message: msg, tree: treeJ.sha, parents: [headSha] }) });
    const newCommitJ = await newCommitR.json();
    if (!newCommitR.ok) throw new Error('commit ' + JSON.stringify(newCommitJ).slice(0, 160));

    const patchR = await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: newCommitJ.sha, force: false }) });
    if (!patchR.ok) throw new Error('patch ' + JSON.stringify(await patchR.json()).slice(0, 160));

    res.status(200).json({ ok: true, commit: newCommitJ.sha, files: tree.length });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
};

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

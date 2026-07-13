// Vercel serverless function — cross-device order store (pickup orders).
// Customers POST here from the order page; the staff dashboard GETs + PATCHes.
// Backed by an Upstash Redis (Vercel Marketplace) REST API. Env vars (any of the
// common name pairs work):
//   KV_REST_API_URL / KV_REST_API_TOKEN   (Vercel KV / Upstash)
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//   REDIS_REST_URL / REDIS_REST_TOKEN
//   ADMIN_PASSWORD  (same staff password as the dashboard; required for GET/PATCH)
// If Redis isn't configured, returns 501 so the client falls back to local mode.

const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL;
const R_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN;
const HASH = 'bg:orders';
const SEQ = 'bg:order:seq';
const TAX = 0.14975;

async function redis(cmd) {
  const r = await fetch(R_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${R_TOK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || ('redis ' + r.status));
  return j.result;
}

function authed(req) {
  const pw = req.headers['x-admin-pw'] || (req.query && req.query.pw);
  const admin = process.env.ADMIN_PASSWORD || '';
  return admin && String(pw || '') === admin;
}

module.exports = async (req, res) => {
  if (!R_URL || !R_TOK) { res.status(501).json({ error: 'not_configured' }); return; }

  try {
    // ---- create (public) ----
    if (req.method === 'POST') {
      let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
      const items = Array.isArray(b.items) ? b.items
        .map(i => ({ name: String(i.name || '').slice(0, 80), qty: Math.max(1, Math.min(99, parseInt(i.qty, 10) || 1)), price: Math.max(0, Number(i.price) || 0) }))
        .filter(i => i.name) : [];
      if (!items.length) { res.status(400).json({ error: 'empty_order' }); return; }
      const sub = items.reduce((s, i) => s + i.qty * i.price, 0);
      const tax = sub * TAX;
      const seq = await redis(['INCR', SEQ]);
      const id = 'BG-' + (2048 + Number(seq));
      const order = {
        id, ts: Date.now(),
        name: String(b.name || '').slice(0, 60) || 'Online order',
        phone: String(b.phone || '').slice(0, 30),
        note: String(b.note || '').slice(0, 200),
        type: 'Pickup', items, subtotal: sub, tax, total: sub + tax, status: 'new',
      };
      await redis(['HSET', HASH, id, JSON.stringify(order)]);
      res.status(200).json({ ok: true, id, order });
      return;
    }

    // ---- everything else needs staff auth ----
    if (!authed(req)) { res.status(401).json({ error: 'unauthorized' }); return; }

    if (req.method === 'GET') {
      const flat = (await redis(['HGETALL', HASH])) || [];
      const orders = [];
      for (let i = 0; i < flat.length; i += 2) { try { orders.push(JSON.parse(flat[i + 1])); } catch {} }
      orders.sort((a, b) => b.ts - a.ts);
      res.status(200).json({ ok: true, orders });
      return;
    }

    if (req.method === 'PATCH') {
      let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
      const id = String(b.id || '');
      const status = String(b.status || '');
      if (!id || !['new', 'preparing', 'ready', 'completed'].includes(status)) { res.status(400).json({ error: 'bad_request' }); return; }
      const cur = await redis(['HGET', HASH, id]);
      if (!cur) { res.status(404).json({ error: 'not_found' }); return; }
      const order = JSON.parse(cur); order.status = status;
      await redis(['HSET', HASH, id, JSON.stringify(order)]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
};

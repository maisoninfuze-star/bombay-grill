/* Bombay Grill — staff orders dashboard.
   LIVE mode: reads/writes orders via /api/orders (cross-device, needs the backend
   configured + admin password). LOCAL mode: falls back to this device's localStorage
   (prototype/demo) when the backend isn't configured. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const KEY = 'bg_orders_v1';
  const money = n => '$' + (n || 0).toFixed(2);
  const LABEL = { new: 'New', preparing: 'Preparing', ready: 'Ready', completed: 'Completed' };
  const NEXT = { new: 'preparing', preparing: 'ready', ready: 'completed' };
  const NEXTLABEL = { new: 'Start preparing', preparing: 'Mark ready', ready: 'Complete' };

  let orders = [];
  let MODE = 'local';                 // 'remote' | 'local'
  let PW = sessionStorage.getItem('bg_admin_pw') || '';
  let filter = 'active';
  let seen = new Set();               // order ids already known (for new-order alert)
  let primed = false;                 // suppress chime on first load
  let audioCtx = null;

  // ---------- backend ----------
  async function api(method, body) {
    return fetch('/api/orders', {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-pw': PW },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  async function fetchRemote() {
    const r = await api('GET');
    if (r.status === 501) return { mode: 'local' };
    if (r.status === 401) return { mode: 'auth' };
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    return { mode: 'remote', orders: j.orders || [] };
  }

  // ---------- local fallback ----------
  function loadLocal() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
  function saveLocal() { localStorage.setItem(KEY, JSON.stringify(orders)); }
  function seed() {
    const now = Date.now(), m = 60000;
    const mk = (id, mins, name, phone, items, status) => {
      const sub = items.reduce((s, i) => s + i.qty * i.price, 0), tax = sub * 0.14975;
      return { id, ts: now - mins * m, name, phone, type: 'Pickup', items, subtotal: sub, tax, total: sub + tax, status };
    };
    return [
      mk('BG-2047', 3, 'Aman S.', '(514) 555-0142', [{ name: 'Butter Chicken', qty: 1, price: 14.99 }, { name: 'Garlic Naan', qty: 2, price: 2.99 }, { name: 'Chicken Biryani', qty: 1, price: 11.99 }], 'new'),
      mk('BG-2046', 9, 'Priya K.', '(514) 555-0198', [{ name: 'Shahi Paneer', qty: 1, price: 12.99 }, { name: 'Naan', qty: 3, price: 1.99 }, { name: 'Mango Lassi', qty: 2, price: 5.99 }], 'preparing'),
      mk('BG-2045', 14, 'Jaspreet', '(514) 555-0111', [{ name: 'Baby Goat Karahi (1kg)', qty: 1, price: 55.99 }, { name: 'Butter Naan', qty: 4, price: 2.99 }], 'preparing'),
      mk('BG-2044', 22, 'Marc D.', '(514) 555-0176', [{ name: 'Chicken Tikka', qty: 1, price: 14.99 }, { name: 'Seekh Kebab', qty: 1, price: 13.99 }, { name: 'Jeera Rice', qty: 1, price: 6.00 }], 'ready'),
      mk('BG-2043', 41, 'Sara M.', '(514) 555-0133', [{ name: 'Vegetable Biryani', qty: 1, price: 9.99 }, { name: 'Dal Makhni', qty: 1, price: 10.99 }], 'completed'),
    ];
  }

  // ---------- boot ----------
  boot();
  async function boot() {
    try {
      const res = await fetchRemote();
      if (res.mode === 'remote') { MODE = 'remote'; orders = res.orders; afterLoad(); return; }
      if (res.mode === 'auth') { showLogin(); return; }
      MODE = 'local'; orders = loadLocal(); if (!orders.length) { orders = seed(); saveLocal(); } afterLoad();
    } catch {
      MODE = 'local'; orders = loadLocal(); if (!orders.length) { orders = seed(); saveLocal(); } afterLoad();
    }
  }

  function afterLoad() { setConn(); prime(); render(); bind(); startPoll(); }
  function prime() { seen = new Set(orders.map(o => o.id)); primed = true; }

  function setConn() {
    const el = $('#d-conn'); if (!el) return;
    el.textContent = MODE === 'remote' ? 'Live' : 'Demo (this device)';
    el.className = 'd-conn ' + (MODE === 'remote' ? 'live' : 'local');
  }

  // ---------- login ----------
  function showLogin() {
    const app = $('#d-app'); if (app) app.style.display = 'none';
    if ($('#d-login')) return;
    const box = document.createElement('div');
    box.id = 'd-login'; box.className = 'd-login';
    box.innerHTML = `<form class="a-login__card" id="d-login-form">
      <div class="logo">Bombay Grill<small>&amp; Sweets · Staff</small></div>
      <h1>Orders</h1><p>Enter the staff password to see live orders.</p>
      <input id="d-pw" type="password" placeholder="Admin password" required>
      <button type="submit" class="d-btn d-adv">Sign in</button></form>`;
    document.body.appendChild(box);
    $('#d-login-form').onsubmit = e => {
      e.preventDefault();
      PW = $('#d-pw').value.trim(); if (!PW) return;
      sessionStorage.setItem('bg_admin_pw', PW);
      box.remove(); const app2 = $('#d-app'); if (app2) app2.style.display = ''; boot();
    };
  }

  // ---------- new-order alert ----------
  function beep() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach((delay, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = i ? 1046 : 784;
        o.connect(g); g.connect(audioCtx.destination);
        const t = audioCtx.currentTime + delay;
        g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        o.start(t); o.stop(t + 0.17);
      });
    } catch {}
  }
  let toastT;
  function toast(msg) {
    let el = $('#d-toast');
    if (!el) { el = document.createElement('div'); el.id = 'd-toast'; el.className = 'd-toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 4000);
  }
  function detectNew() {
    const fresh = orders.filter(o => o.status === 'new' && !seen.has(o.id));
    orders.forEach(o => seen.add(o.id));
    if (primed && fresh.length) {
      beep();
      toast(`New order — ${fresh[0].id} (${fresh[0].name || 'Online'})`);
      document.title = `(${orders.filter(o => o.status === 'new').length}) New orders — Bombay Grill`;
    }
  }

  // ---------- status actions ----------
  async function setStatus(id, status) {
    const o = orders.find(x => x.id === id); if (!o) return;
    o.status = status;
    if (MODE === 'remote') { render(); try { await api('PATCH', { id, status }); } catch {} refresh(); }
    else { saveLocal(); render(); }
  }

  // ---------- refresh / poll ----------
  async function refresh() {
    if (MODE === 'remote') {
      try { const res = await fetchRemote(); if (res.mode === 'remote') { orders = res.orders; detectNew(); setConn(); render(); } } catch {}
    } else { orders = loadLocal(); detectNew(); render(); }
  }
  let pollT;
  function startPoll() { clearInterval(pollT); pollT = setInterval(refresh, MODE === 'remote' ? 10000 : 15000); }

  // ---------- time ----------
  function timeAgo(ts) { const s = Math.max(0, (Date.now() - ts) / 1000); if (s < 60) return 'just now'; const m = Math.floor(s / 60); if (m < 60) return m + ' min ago'; return Math.floor(m / 60) + ' h ago'; }
  function clock(ts) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  // ---------- render ----------
  function render() {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const today = orders.filter(o => o.ts >= startOfDay.getTime());
    const revenue = today.reduce((s, o) => s + o.total, 0);
    setText('#s-orders', today.length);
    setText('#s-revenue', money(revenue));
    setText('#s-pending', orders.filter(o => o.status === 'new' || o.status === 'preparing').length);
    setText('#s-ready', orders.filter(o => o.status === 'ready').length);
    setText('#s-avg', today.length ? money(revenue / today.length) : '$0.00');

    const counts = { active: 0, new: 0, preparing: 0, ready: 0, completed: 0, all: orders.length };
    orders.forEach(o => { counts[o.status]++; if (o.status !== 'completed') counts.active++; });
    document.querySelectorAll('.d-tab').forEach(t => { const f = t.dataset.f; const c = t.querySelector('.c'); if (c) c.textContent = counts[f] ?? 0; t.classList.toggle('active', f === filter); });

    let list = orders.slice().sort((a, b) => b.ts - a.ts);
    if (filter === 'active') list = list.filter(o => o.status !== 'completed');
    else if (filter !== 'all') list = list.filter(o => o.status === filter);

    const root = $('#d-orders');
    if (!list.length) { root.innerHTML = `<div class="d-empty">No orders here yet.${MODE === 'remote' ? ' New online orders appear automatically.' : ''}</div>`; return; }
    root.innerHTML = list.map(o => `
      <article class="d-order s-${o.status}">
        <div class="d-order__head">
          <div><span class="d-id">${o.id}</span> <span class="d-type">${o.type || 'Pickup'}</span></div>
          <span class="d-badge b-${o.status}">${LABEL[o.status]}</span>
        </div>
        <div class="d-cust">${o.name || 'Online order'}${o.phone ? ` · <a href="tel:${String(o.phone).replace(/[^0-9+]/g, '')}">${o.phone}</a>` : ''} <span class="d-time">· ${clock(o.ts)} (${timeAgo(o.ts)})</span></div>
        ${o.note ? `<div class="d-cust" style="color:var(--gold-soft)">“${o.note}”</div>` : ''}
        <ul class="d-items">${o.items.map(i => `<li><span class="q">${i.qty}×</span> ${i.name}<span class="p">${money(i.qty * i.price)}</span></li>`).join('')}</ul>
        <div class="d-foot">
          <span class="d-total">Total <b>${money(o.total)}</b></span>
          <div class="d-actions">
            ${NEXT[o.status] ? `<button class="d-btn d-adv" data-adv="${o.id}">${NEXTLABEL[o.status]} →</button>` : ''}
            ${o.status !== 'completed' ? `<button class="d-btn d-ghost" data-cancel="${o.id}">Cancel</button>` : `<button class="d-btn d-ghost" data-reopen="${o.id}">Reopen</button>`}
          </div>
        </div>
      </article>`).join('');
  }
  function setText(sel, v) { const el = $(sel); if (el) el.textContent = v; }

  // ---------- events ----------
  function bind() {
    document.addEventListener('click', e => {
      const adv = e.target.closest('[data-adv]'), can = e.target.closest('[data-cancel]'), re = e.target.closest('[data-reopen]'), tab = e.target.closest('.d-tab');
      if (adv) { const o = orders.find(x => x.id === adv.dataset.adv); if (o && NEXT[o.status]) setStatus(o.id, NEXT[o.status]); }
      else if (can) setStatus(can.dataset.cancel, 'completed');
      else if (re) setStatus(re.dataset.reopen, 'preparing');
      else if (tab) { filter = tab.dataset.f; render(); }
    });
    $('#d-refresh')?.addEventListener('click', refresh);
    const clear = $('#d-clear');
    if (clear) {
      if (MODE === 'remote') clear.style.display = 'none';
      else clear.addEventListener('click', () => { if (confirm('Reload sample demo orders?')) { orders = seed(); saveLocal(); prime(); render(); } });
    }
    window.addEventListener('focus', () => { document.title = 'Orders Dashboard — Bombay Grill & Sweets'; });
  }
})();

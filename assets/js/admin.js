/* Bombay Grill — staff content dashboard.
   Edit menu prices / availability / photos + site photos, then Publish → the
   /api/publish function commits to GitHub and Vercel redeploys (live in ~1 min).
   Requires menu-data.js + photo-manifest.js loaded first. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => '$' + Number(n || 0).toFixed(2);
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // photo resolution — mirrors order.js (keep in sync)
  const ITEM_PHOTOS = {
    "Chicken Korma": "chicken-korma", "Lamb Korma": "lamb-korma", "Chicken Vindaloo": "chicken-vindaloo",
    "Chicken Tikka Masala": "chicken-tikka-masala", "Chicken Bhuna": "chicken-bhuna", "Chicken Jalfrezi": "chicken-jalfrezi",
    "Lamb Rogan Josh": "lamb-rogan-josh", "Palak Paneer": "palak-paneer", "Malai Kofta": "malai-kofta",
    "Aloo Gobi": "aloo-gobi", "Mattar Paneer": "mattar-paneer", "Vegetable Korma": "vegetable-korma",
    "Butter Lamb": "butter-lamb", "Fish Curry": "fish-curry", "Shrimp Masala": "shrimp-masala",
    "Chicken Manchurian": "chicken-manchurian", "Lamb Biryani": "lamb-biryani", "Vegetarian Biryani": "veg-biryani",
    "Cheese Naan": "cheese-naan", "Vegetable Pakora": "vegetable-pakora", "Chana Samosa": "chana-samosa",
    "Onion Bhaji": "onion-bhaji", "Spring Roll": "spring-roll", "Mango Lassi": "mango-lassi", "Masala Tea": "masala-tea"
  };
  const HAVE = new Set(window.PHOTO_SLUGS || []);
  const photoOf = it => {
    if (it.img) return it.img;
    if (ITEM_PHOTOS[it.n]) return ITEM_PHOTOS[it.n];
    const s = slugify(it.n);
    return HAVE.has(s) ? s : '';
  };
  const ovKey = (catId, name) => catId + ':' + slugify(name);
  const THUMB = (slug, v) => `assets/photos/thumb/${slug}.jpg` + (v ? `?v=${v}` : '');
  const FULL = (slug, v) => `assets/photos/full/${slug}.jpg` + (v ? `?v=${v}` : '');

  // Site photos (non-dish images). slug = filename stem in assets/photos/full.
  const SITE_PHOTOS = [
    { slug: 'hero-3', label: 'Homepage hero image', note: 'The large lead image at the top of the home page.' },
  ];

  // ---- state ----
  let ORIG = { items: {}, photos: {} };     // last-published overrides
  let editsItems = {};                       // key -> {price,veg,hidden} (working copy)
  let editsPhotos = {};                      // slug -> version (working copy)
  const pendingPhotos = {};                  // slug -> {full:dataURL, thumb:dataURL|null}
  const newSlugs = {};                       // itemKey -> new slug (items that had no photo)
  const rowSlug = {};                        // itemKey -> current resolved slug
  let PW = sessionStorage.getItem('bg_admin_pw') || '';

  const defaults = {}; // key -> {price,veg,name,fr,cat,slug}
  MENU_CATEGORIES.forEach(cat => cat.items.forEach(it => {
    const key = ovKey(cat.id, it.n);
    defaults[key] = { price: it.p, veg: it.v, name: it.n, fr: it.f, cat: cat.id, slug: photoOf(it) };
    rowSlug[key] = photoOf(it);
  }));

  // ---- boot ----
  fetch('assets/data/overrides.json?_=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : {})
    .then(j => { ORIG = { items: j.items || {}, photos: j.photos || {} }; editsPhotos = { ...ORIG.photos }; editsItems = JSON.parse(JSON.stringify(ORIG.items)); })
    .catch(() => {})
    .finally(init);

  function init() {
    if (PW) showApp(); else showLogin();
  }

  // ---- login ----
  function showLogin() {
    $('#login').style.display = 'flex';
    $('#app').style.display = 'none';
    const form = $('#login-form');
    form.onsubmit = e => {
      e.preventDefault();
      PW = $('#pw').value.trim();
      if (!PW) return;
      sessionStorage.setItem('bg_admin_pw', PW);
      showApp();
    };
  }

  // ---- effective value helpers ----
  const effPrice = key => (editsItems[key] && typeof editsItems[key].price === 'number') ? editsItems[key].price : defaults[key].price;
  const effVeg = key => (editsItems[key] && typeof editsItems[key].veg === 'number') ? editsItems[key].veg : defaults[key].veg;
  const effHidden = key => !!(editsItems[key] && editsItems[key].hidden);
  const effVer = slug => editsPhotos[slug] || ORIG.photos[slug] || 0;

  function setItem(key, patch) {
    editsItems[key] = Object.assign({}, editsItems[key], patch);
    markDirty();
  }

  // ---- render app ----
  function showApp() {
    $('#login').style.display = 'none';
    $('#app').style.display = 'block';
    renderMenu();
    renderSite();
    bindChrome();
    markDirty();
  }

  function bindChrome() {
    $('#tab-menu').onclick = () => switchTab('menu');
    $('#tab-site').onclick = () => switchTab('site');
    $('#tab-help').onclick = () => switchTab('help');
    $('#publish-btn').onclick = doPublish;
    $('#discard-btn').onclick = () => { if (confirm('Discard all unpublished changes?')) location.reload(); };
    $('#logout-btn').onclick = () => { sessionStorage.removeItem('bg_admin_pw'); location.reload(); };
    const search = $('#search');
    if (search) search.oninput = () => {
      const q = search.value.toLowerCase().trim();
      $$('.a-item').forEach(row => {
        const hay = row.dataset.search;
        row.style.display = !q || hay.indexOf(q) >= 0 ? '' : 'none';
      });
      $$('.a-cat').forEach(sec => {
        const any = $$('.a-item', sec).some(r => r.style.display !== 'none');
        sec.style.display = any ? '' : 'none';
      });
    };
  }

  function switchTab(t) {
    ['menu', 'site', 'help'].forEach(x => {
      $('#tab-' + x).classList.toggle('active', x === t);
      $('#pane-' + x).style.display = x === t ? 'block' : 'none';
    });
    $('#menu-toolbar').style.display = t === 'menu' ? '' : 'none';
  }

  function renderMenu() {
    const root = $('#pane-menu');
    root.innerHTML = '';
    MENU_CATEGORIES.forEach(cat => {
      const sec = document.createElement('section');
      sec.className = 'a-cat';
      sec.innerHTML = `<h2 class="a-cat__h">${cat.n} <span>· ${cat.f}</span></h2><div class="a-list"></div>`;
      const list = sec.querySelector('.a-list');
      cat.items.forEach(it => {
        const key = ovKey(cat.id, it.n);
        const slug = rowSlug[key];
        const row = document.createElement('div');
        row.className = 'a-item';
        row.dataset.key = key;
        row.dataset.search = (it.n + ' ' + it.f).toLowerCase();
        row.innerHTML = `
          <div class="a-thumb" data-thumb>
            ${slug ? `<img src="${THUMB(slug, effVer(slug))}" alt="${it.n}">` : `<div class="a-noimg">No photo</div>`}
            <label class="a-replace"><input type="file" accept="image/*" hidden><span>Replace</span></label>
          </div>
          <div class="a-info">
            <div class="a-name">${it.n}</div>
            <div class="a-fr">${it.f}</div>
          </div>
          <div class="a-fields">
            <label class="a-f"><span>Price</span>
              <div class="a-price"><i>$</i><input type="number" step="0.01" min="0" data-price value="${effPrice(key).toFixed(2)}"></div>
            </label>
            <label class="a-f"><span>Type</span>
              <select data-veg><option value="1"${effVeg(key) ? ' selected' : ''}>Veg</option><option value="0"${!effVeg(key) ? ' selected' : ''}>Non-veg</option></select>
            </label>
            <label class="a-f a-avail"><span>Available</span>
              <button type="button" class="a-toggle ${effHidden(key) ? '' : 'on'}" data-avail role="switch" aria-checked="${!effHidden(key)}"><i></i></button>
            </label>
          </div>`;
        // price
        row.querySelector('[data-price]').addEventListener('input', e => {
          const v = parseFloat(e.target.value);
          setItem(key, { price: isNaN(v) ? undefined : v });
        });
        // veg
        row.querySelector('[data-veg]').addEventListener('change', e => setItem(key, { veg: parseInt(e.target.value, 10) }));
        // availability
        const tgl = row.querySelector('[data-avail]');
        tgl.addEventListener('click', () => {
          const available = !tgl.classList.contains('on'); // toggled new state
          tgl.classList.toggle('on', available);
          tgl.setAttribute('aria-checked', String(available));
          row.classList.toggle('a-hidden', !available);
          setItem(key, { hidden: !available });
        });
        // replace photo
        row.querySelector('input[type=file]').addEventListener('change', e => onPhoto(e, key, row, false));
        list.appendChild(row);
      });
      root.appendChild(sec);
    });
  }

  function renderSite() {
    const root = $('#pane-site');
    root.innerHTML = '<p class="a-hint">These are the non-dish photos on the website. Dish photos are managed in the Menu tab (updating a dish photo also updates it on the home page).</p>';
    SITE_PHOTOS.forEach(sp => {
      const row = document.createElement('div');
      row.className = 'a-item a-item--site';
      row.dataset.key = 'site:' + sp.slug;
      row.innerHTML = `
        <div class="a-thumb a-thumb--wide" data-thumb>
          <img src="${FULL(sp.slug, effVer(sp.slug))}" alt="${sp.label}">
          <label class="a-replace"><input type="file" accept="image/*" hidden><span>Replace</span></label>
        </div>
        <div class="a-info"><div class="a-name">${sp.label}</div><div class="a-fr">${sp.note}</div></div>`;
      row.querySelector('input[type=file]').addEventListener('change', e => onPhoto(e, sp.slug, row, true));
      root.appendChild(row);
    });
  }

  // ---- photo pick + client-side resize ----
  function onPhoto(e, keyOrSlug, row, isSite) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        let slug;
        if (isSite) {
          slug = keyOrSlug;
          pendingPhotos[slug] = { full: resize(img, 2000, 0.85), thumb: null };
        } else {
          const key = keyOrSlug;
          slug = rowSlug[key];
          if (!slug) { slug = slugify(defaults[key].name); rowSlug[key] = slug; newSlugs[key] = slug; }
          pendingPhotos[slug] = { full: resize(img, 1600, 0.82), thumb: resize(img, 800, 0.78) };
        }
        // preview
        const prev = pendingPhotos[slug].full;
        let el = row.querySelector('[data-thumb] img');
        if (!el) { const box = row.querySelector('[data-thumb]'); box.querySelector('.a-noimg')?.remove(); el = document.createElement('img'); box.insertBefore(el, box.firstChild); }
        el.src = prev;
        row.querySelector('[data-thumb]').classList.add('a-changed');
        markDirty();
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  }

  function resize(img, max, q) {
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', q);
  }

  // ---- dirty tracking ----
  function pruneItems() {
    // keep only entries that differ from menu defaults
    const out = {};
    Object.keys(editsItems).forEach(key => {
      const e = editsItems[key] || {}, d = defaults[key];
      const price = (typeof e.price === 'number') ? e.price : d.price;
      const veg = (typeof e.veg === 'number') ? e.veg : d.veg;
      const hidden = !!e.hidden;
      const rec = {};
      if (Math.abs(price - d.price) > 0.0001) rec.price = price;
      if (veg !== d.veg) rec.veg = veg;
      if (hidden) rec.hidden = true;
      if (Object.keys(rec).length) out[key] = rec;
    });
    return out;
  }

  function changeCount() {
    const items = pruneItems();
    const itemDiff = JSON.stringify(items) !== JSON.stringify(ORIG.items);
    let n = 0;
    // count changed item keys
    const allKeys = new Set([...Object.keys(items), ...Object.keys(ORIG.items)]);
    allKeys.forEach(k => { if (JSON.stringify(items[k]) !== JSON.stringify(ORIG.items[k])) n++; });
    n += Object.keys(pendingPhotos).length;
    return { n, items, hasItemDiff: itemDiff };
  }

  function markDirty() {
    const { n } = changeCount();
    const btn = $('#publish-btn');
    btn.textContent = n ? `Publish ${n} change${n > 1 ? 's' : ''}` : 'Nothing to publish';
    btn.disabled = !n;
    $('#discard-btn').style.display = n ? '' : 'none';
  }

  // ---- publish ----
  async function doPublish() {
    const { items } = changeCount();
    const photos = { ...ORIG.photos };
    const images = [];
    Object.keys(pendingPhotos).forEach(slug => {
      const p = pendingPhotos[slug];
      images.push({ path: `assets/photos/full/${slug}.jpg`, b64: strip(p.full) });
      if (p.thumb) images.push({ path: `assets/photos/thumb/${slug}.jpg`, b64: strip(p.thumb) });
      photos[slug] = (ORIG.photos[slug] || 0) + 1;
    });
    const overrides = { updatedAt: new Date().toISOString(), items, photos };

    // manifest update if new slugs were introduced
    let manifestJs = null;
    const adds = Object.values(newSlugs).filter(s => pendingPhotos[s]);
    if (adds.length) {
      const set = new Set(window.PHOTO_SLUGS || []);
      adds.forEach(s => set.add(s));
      manifestJs = 'window.PHOTO_SLUGS=' + JSON.stringify([...set].sort()) + ';\n';
    }

    const payload = { password: PW, overrides, images, manifestJs };
    const bytes = JSON.stringify(payload).length;
    if (bytes > 4_200_000) { setStatus('err', `Too much to publish at once (${(bytes / 1e6).toFixed(1)} MB). Publish fewer photos, then repeat.`); return; }

    const btn = $('#publish-btn');
    btn.disabled = true;
    setStatus('busy', 'Publishing… committing changes and triggering the deploy.');
    try {
      const r = await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { setStatus('err', 'Wrong admin password. Log out and try again.'); btn.disabled = false; return; }
      if (!r.ok || !j.ok) { setStatus('err', 'Publish failed: ' + (j.error || r.status)); btn.disabled = false; return; }
      // success: adopt new state as published
      ORIG = { items: overrides.items, photos: overrides.photos };
      editsItems = JSON.parse(JSON.stringify(ORIG.items));
      editsPhotos = { ...ORIG.photos };
      Object.keys(pendingPhotos).forEach(k => delete pendingPhotos[k]);
      $$('.a-changed').forEach(el => el.classList.remove('a-changed'));
      setStatus('ok', `Published! ${j.commit ? 'Commit ' + j.commit.slice(0, 7) + '. ' : ''}Your site updates in about a minute.`);
      markDirty();
    } catch (err) {
      setStatus('err', 'Network error: ' + err.message);
      btn.disabled = false;
    }
  }

  const strip = dataURL => dataURL.split(',')[1];
  function setStatus(kind, msg) {
    const el = $('#status');
    el.className = 'a-status a-status--' + kind;
    el.textContent = msg;
    el.style.display = 'block';
  }
})();

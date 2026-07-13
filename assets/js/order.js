/* Bombay Grill — online ordering (pickup). Delivery via Snappy added later.
   Renders MENU_CATEGORIES, manages a localStorage cart, drawer + pickup checkout. */
(function(){
  const $ = (s,r=document)=>r.querySelector(s);
  const money = n => '$'+n.toFixed(2);
  // Live overrides published from the staff dashboard (prices / availability / photo versions).
  let OV = { items:{}, photos:{} };
  const THUMB = slug => `assets/photos/thumb/${slug}.jpg` + (OV.photos && OV.photos[slug] ? `?v=${OV.photos[slug]}` : '');
  // generated/extra photos mapped by item name (so menu-data stays clean)
  const ITEM_PHOTOS = {
    "Chicken Korma":"chicken-korma","Lamb Korma":"lamb-korma","Chicken Vindaloo":"chicken-vindaloo",
    "Chicken Tikka Masala":"chicken-tikka-masala","Chicken Bhuna":"chicken-bhuna","Chicken Jalfrezi":"chicken-jalfrezi",
    "Lamb Rogan Josh":"lamb-rogan-josh","Palak Paneer":"palak-paneer","Malai Kofta":"malai-kofta",
    "Aloo Gobi":"aloo-gobi","Mattar Paneer":"mattar-paneer","Vegetable Korma":"vegetable-korma",
    "Butter Lamb":"butter-lamb","Fish Curry":"fish-curry","Shrimp Masala":"shrimp-masala",
    "Chicken Manchurian":"chicken-manchurian","Lamb Biryani":"lamb-biryani","Vegetarian Biryani":"veg-biryani",
    "Cheese Naan":"cheese-naan","Vegetable Pakora":"vegetable-pakora","Chana Samosa":"chana-samosa",
    "Onion Bhaji":"onion-bhaji","Spring Roll":"spring-roll","Mango Lassi":"mango-lassi","Masala Tea":"masala-tea"
  };
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const HAVE = new Set(window.PHOTO_SLUGS || []);
  const photoOf = it => {
    if (it.img) return it.img;                      // explicit (real photos in menu-data)
    if (ITEM_PHOTOS[it.n]) return ITEM_PHOTOS[it.n]; // first-batch custom slugs
    const s = slugify(it.n);
    return HAVE.has(s) ? s : '';                    // auto-match generated photos
  };
  // ---- live overrides (dashboard) ----
  const ovKey = (catId, name) => catId + ':' + slugify(name);
  function applyOverrides(){
    MENU_CATEGORIES.forEach(cat => cat.items.forEach(it => {
      const o = OV.items && OV.items[ovKey(cat.id, it.n)];
      if(!o){ it._hidden = false; return; }
      if(typeof o.price === 'number') it.p = o.price;
      if(typeof o.veg === 'number') it.v = o.veg;
      it._hidden = !!o.hidden;
    }));
  }
  async function loadOverrides(){
    try{
      const r = await fetch('assets/data/overrides.json?_='+Date.now(), {cache:'no-store'});
      if(r.ok){ const j = await r.json(); OV = { items:j.items||{}, photos:j.photos||{} }; applyOverrides(); }
    }catch(_){}
  }
  const TAX = 0.14975; // QC GST+QST
  const KEY = 'bg_cart_v1';

  // ---- SVG icons (no emoji) ----
  const ICN = {
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>',
  };

  // ---- cart state ----
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY))||[]; } catch{}
  const save = ()=>localStorage.setItem(KEY, JSON.stringify(cart));
  const find = k => cart.find(i=>i.key===k);
  const count = ()=>cart.reduce((s,i)=>s+i.qty,0);
  const subtotal = ()=>cart.reduce((s,i)=>s+i.qty*i.price,0);

  function add(item){
    const ex=find(item.key);
    if(ex) ex.qty++; else cart.push({...item, qty:1});
    save(); renderAll();
  }
  function chg(key,d){
    const it=find(key); if(!it) return;
    it.qty+=d; if(it.qty<=0) cart=cart.filter(i=>i.key!==key);
    save(); renderAll();
  }

  // ---- language ----
  let LANG = window.BG_LANG || 'en';
  const T = {
    en:{items:'items', add:'Add', empty1:'Your bag is empty.', empty2:'Add some dishes to get started.', veg:'Vegetarian', nv:'Non-vegetarian',
        err_name:'Please add your name.', err_phone:'Please add a valid phone number.', placing:'Placing order…'},
    fr:{items:'articles', add:'Ajouter', empty1:'Votre panier est vide.', empty2:'Ajoutez des plats pour commencer.', veg:'Végétarien', nv:'Non végétarien',
        err_name:'Veuillez indiquer votre nom.', err_phone:'Veuillez indiquer un numéro valide.', placing:'Envoi…'}
  };
  const t = k => (T[LANG]||T.en)[k];
  const primary   = it => LANG==='fr' ? it.f : it.n;
  const secondary = it => LANG==='fr' ? it.n : it.f;
  const catName   = c  => LANG==='fr' ? c.f : c.n;
  const catSub    = c  => LANG==='fr' ? c.n : c.f;

  // ---- build menu (re-callable on language change) ----
  const root = $('#menu-root'), rail = $('#cat-rail'), pills = $('#cat-pills-track');
  let io; // scrollspy observer — declared before buildMenu() runs (avoids TDZ error)
  function buildMenu(){
    root.innerHTML=''; rail.innerHTML=''; pills.innerHTML='';
    MENU_CATEGORIES.forEach(cat=>{
      const visible=cat.items.filter(x=>!x._hidden);
      if(!visible.length) return;
      rail.insertAdjacentHTML('beforeend',
        `<button class="cat-link" data-cat="${cat.id}"><span>${catName(cat)}</span><span class="c">${visible.length}</span></button>`);
      pills.insertAdjacentHTML('beforeend',
        `<button class="cat-pill" data-cat="${cat.id}">${catName(cat)}</button>`);
      const grp=document.createElement('section');
      grp.className='menu-group'; grp.id='cat-'+cat.id;
      grp.innerHTML=`<div class="menu-group__head"><h2>${catName(cat)}</h2><span class="fr">${catSub(cat)}</span><span class="ct">${visible.length} ${t('items')}</span></div><div class="item-grid"></div>`;
      const grid=grp.querySelector('.item-grid');
      cat.items.forEach((it,idx)=>{
        if(it._hidden) return;
        const key=cat.id+':'+idx;
        const pic=photoOf(it);
        const media = pic
          ? `<img src="${THUMB(pic)}" alt="${primary(it)}" width="800" height="600" loading="lazy">`
          : `<div class="item-card__fallback"><span>${primary(it)}</span></div>`;
        grid.insertAdjacentHTML('beforeend', `
          <article class="item-card" data-key="${key}">
            <div class="item-card__media">
              <span class="veg-dot ${it.v?'':'nv'}" title="${it.v?t('veg'):t('nv')}"></span>
              ${media}
            </div>
            <div class="item-card__body">
              <h3>${primary(it)}</h3><span class="fr">${secondary(it)}</span>
              ${(LANG==='fr'&&it.df)?`<p class="d">${it.df}</p>`:(it.d?`<p class="d">${it.d}</p>`:'')}
              <div class="item-card__foot">
                <span class="item-card__price">${money(it.p)}</span>
                <div class="ctrl" data-ctrl="${key}"></div>
              </div>
            </div>
          </article>`);
        grid.lastElementChild._item={key,name:it.n,fr:it.f,price:it.p,img:pic};
      });
      root.appendChild(grp);
    });
    setupScrollspy();
  }

  // delegate add / qty
  root.addEventListener('click', e=>{
    const card=e.target.closest('.item-card'); if(!card) return;
    const m=card._item;
    if(e.target.closest('[data-add]')){ add(m); pulse(card); }
    else if(e.target.closest('[data-inc]')){ chg(m.key,1); }
    else if(e.target.closest('[data-dec]')){ chg(m.key,-1); }
  });
  function pulse(card){ card.animate([{transform:'scale(1)'},{transform:'scale(.97)'},{transform:'scale(1)'}],{duration:240,easing:'ease-out'}); }

  // render the per-card control (Add button or qty stepper)
  function renderControls(){
    document.querySelectorAll('[data-ctrl]').forEach(box=>{
      const key=box.getAttribute('data-ctrl'); const it=find(key);
      box.innerHTML = it
        ? `<div class="qty"><button data-dec aria-label="Remove one">−</button><span>${it.qty}</span><button data-inc aria-label="Add one">+</button></div>`
        : `<button class="add-btn" data-add>${ICN.plus} ${t('add')}</button>`;
    });
  }

  // ---- cart UI ----
  const fab=$('#cart-fab'), drawer=$('#cart'), scrim=$('#cart-scrim'),
        itemsEl=$('#cart-items'), footEl=$('#cart-foot');
  const openCart=()=>{ drawer.classList.add('open'); scrim.classList.add('open'); };
  const closeCart=()=>{ drawer.classList.remove('open'); scrim.classList.remove('open'); };
  fab.addEventListener('click',openCart); scrim.addEventListener('click',closeCart);
  $('#cart-close').addEventListener('click',closeCart);

  function renderCart(){
    const c=count();
    fab.classList.toggle('show', c>0);
    $('#fab-count').textContent=c;
    if(!cart.length){
      itemsEl.innerHTML=`<div class="cart__empty">${ICN.bag}<p>${t('empty1')}</p><p style="font-size:.82rem">${t('empty2')}</p></div>`;
      footEl.style.display='none'; return;
    }
    footEl.style.display='flex';
    itemsEl.innerHTML=cart.map(i=>`
      <div class="cart-row">
        ${i.img?`<img src="${THUMB(i.img)}" alt="${i.name}">`:`<div class="ph"></div>`}
        <div><div class="nm">${LANG==='fr'&&i.fr?i.fr:i.name}</div><div class="pr">${money(i.price)}</div></div>
        <div class="qty"><button data-dec="${i.key}" aria-label="Remove one">−</button><span>${i.qty}</span><button data-inc="${i.key}" aria-label="Add one">+</button></div>
      </div>`).join('');
    const sub=subtotal(), tax=sub*TAX;
    footEl.querySelector('#sum-sub').textContent=money(sub);
    footEl.querySelector('#sum-tax').textContent=money(tax);
    footEl.querySelector('#sum-total').textContent=money(sub+tax);
  }
  itemsEl.addEventListener('click',e=>{
    const inc=e.target.closest('[data-inc]'), dec=e.target.closest('[data-dec]');
    if(inc) chg(inc.getAttribute('data-inc'),1);
    if(dec) chg(dec.getAttribute('data-dec'),-1);
  });

  function renderAll(){ renderControls(); renderCart(); }
  // load published overrides first, then build (falls back to defaults if unavailable)
  loadOverrides().finally(()=>{ buildMenu(); renderAll(); });
  // re-render when language toggles
  window.addEventListener('bg:lang', e=>{ LANG=e.detail||'en'; buildMenu(); renderAll(); });

  // ---- order type segment ---- (Pickup is the in-site flow; Delivery hands off to Uber Eats)
  const segPickup=$('#seg-pickup');
  if(segPickup) segPickup.addEventListener('click',()=>{ segPickup.classList.add('active'); const d=$('#seg-delivery'); if(d) d.classList.remove('active'); });

  // ---- category nav: click + scrollspy ----
  function stickyOffset(){
    const head=document.querySelector('.site-head');
    const pills=document.querySelector('.cat-pills');
    const ph=(pills && getComputedStyle(pills).display!=='none') ? pills.offsetHeight : 0;
    return (head?head.offsetHeight:60) + ph + 16;
  }
  function goto(id){
    const el=$('#cat-'+id); if(!el) return;
    const off=stickyOffset();
    if(window.lenis){ window.lenis.scrollTo(el,{offset:-off}); return; }
    // Instant positional scroll — the only form that reliably moves the page on
    // mobile Safari ({behavior:'smooth'} and rAF are flaky there).
    const target = Math.max(0, el.getBoundingClientRect().top + (window.scrollY||window.pageYOffset||0) - off);
    window.scrollTo(0, target);
  }
  rail.addEventListener('click',e=>{const b=e.target.closest('[data-cat]'); if(b) goto(b.dataset.cat);});
  pills.addEventListener('click',e=>{const b=e.target.closest('[data-cat]'); if(b) goto(b.dataset.cat);});

  function setupScrollspy(){
    if(io) io.disconnect();
    io=new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(en.isIntersecting){
          const id=en.target.id.replace('cat-','');
          document.querySelectorAll('[data-cat]').forEach(l=>l.classList.toggle('active', l.dataset.cat===id));
          const pill=pills.querySelector(`[data-cat="${id}"]`);
          if(pill) pill.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
        }
      });
    },{rootMargin:'-45% 0px -50% 0px'});
    document.querySelectorAll('.menu-group').forEach(g=>io.observe(g));
  }

  // ---- delivery → Uber Eats ----
  const UBER_URL = 'https://www.ubereats.com/ca/store/bombay-grill-&-sweets/I2TUV_-5VfiqRWkUwV_stA';
  const del=$('#seg-delivery');
  if(del) del.addEventListener('click',()=>{ window.open(UBER_URL,'_blank','noopener'); });

  // ---- checkout (pickup) ----
  const errEl=$('#checkout-err'), nameEl=$('#c-name'), phoneEl=$('#c-phone'), btn=$('#checkout-btn');
  function showErr(m){ if(!errEl) return; errEl.textContent=m; errEl.hidden=false; }
  function clearErr(){ if(errEl) errEl.hidden=true; }
  [nameEl,phoneEl].forEach(el=>el&&el.addEventListener('input',clearErr));

  function localLog(order){
    try{ const K='bg_orders_v1'; const list=JSON.parse(localStorage.getItem(K))||[]; list.push(order); localStorage.setItem(K, JSON.stringify(list)); }catch{}
  }
  function smsFallback(order){
    const lines=order.items.map(i=>`${i.qty} x ${i.name} - ${money(i.qty*i.price)}`).join('\n');
    const msg=`Bombay Grill - PICKUP order ${order.id}\n${order.name}${order.phone?' / '+order.phone:''}\n\n${lines}\n\nTotal ${money(order.total)}`;
    const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent);
    window.location.href=`sms:+15144213522${isIOS?'&':'?'}body=${encodeURIComponent(msg)}`;
  }
  function confirmView(id, texted){
    cart=[]; save(); renderAll(); closeCart();
    const oc=$('#order-confirm'); if(!oc){ alert('Order placed: '+id); return; }
    $('#oc-id').textContent='#'+id;
    const sms=$('#oc-sms'); if(sms) sms.hidden=!texted;
    oc.hidden=false;
  }

  btn && btn.addEventListener('click', async ()=>{
    if(!cart.length) return;
    const name=(nameEl&&nameEl.value.trim())||'';
    const phone=(phoneEl&&phoneEl.value.trim())||'';
    if(!name){ showErr(t('err_name')); nameEl&&nameEl.focus(); return; }
    if(phone.replace(/\D/g,'').length<10){ showErr(t('err_phone')); phoneEl&&phoneEl.focus(); return; }
    clearErr();
    const sub=subtotal(), tax=sub*TAX;
    const items=cart.map(i=>({name:i.name, qty:i.qty, price:i.price}));
    const payload={ name, phone, type:'Pickup', items };
    btn.disabled=true; const label=btn.querySelector('span'); const old=label?label.textContent:''; if(label) label.textContent=t('placing');
    try{
      const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(r.ok){ const j=await r.json(); confirmView(j.id, false); }
      else { throw new Error('backend '+r.status); } // 501 not configured, etc → fallback
    }catch(_){
      // No backend (yet) or offline: log locally + text the restaurant so the order still lands.
      const id='BG-'+String(2048+((JSON.parse(localStorage.getItem('bg_orders_v1')||'[]')).length));
      const order={ id, ts:Date.now(), name, phone, type:'Pickup', items, subtotal:sub, tax, total:sub+tax, status:'new' };
      localLog(order);
      confirmView(id, true);
      setTimeout(()=>smsFallback(order), 400);
    }finally{ btn.disabled=false; if(label) label.textContent=old; }
  });
  const ocClose=$('#oc-close'); if(ocClose) ocClose.addEventListener('click',()=>{ $('#order-confirm').hidden=true; });
})();

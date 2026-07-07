/* Bombay Grill — online ordering (pickup). Delivery via Snappy added later.
   Renders MENU_CATEGORIES, manages a localStorage cart, drawer + pickup checkout. */
(function(){
  const $ = (s,r=document)=>r.querySelector(s);
  const money = n => '$'+n.toFixed(2);
  const THUMB = slug => `assets/photos/thumb/${slug}.jpg`;
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
    en:{items:'items', add:'Add', empty1:'Your bag is empty.', empty2:'Add some dishes to get started.', veg:'Vegetarian', nv:'Non-vegetarian'},
    fr:{items:'articles', add:'Ajouter', empty1:'Votre panier est vide.', empty2:'Ajoutez des plats pour commencer.', veg:'Végétarien', nv:'Non végétarien'}
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
      rail.insertAdjacentHTML('beforeend',
        `<button class="cat-link" data-cat="${cat.id}"><span>${catName(cat)}</span><span class="c">${cat.items.length}</span></button>`);
      pills.insertAdjacentHTML('beforeend',
        `<button class="cat-pill" data-cat="${cat.id}">${catName(cat)}</button>`);
      const grp=document.createElement('section');
      grp.className='menu-group'; grp.id='cat-'+cat.id;
      grp.innerHTML=`<div class="menu-group__head"><h2>${catName(cat)}</h2><span class="fr">${catSub(cat)}</span><span class="ct">${cat.items.length} ${t('items')}</span></div><div class="item-grid"></div>`;
      const grid=grp.querySelector('.item-grid');
      cat.items.forEach((it,idx)=>{
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
              ${it.d?`<p class="d">${it.d}</p>`:''}
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
  buildMenu(); renderAll();
  // re-render when language toggles
  window.addEventListener('bg:lang', e=>{ LANG=e.detail||'en'; buildMenu(); renderAll(); });

  // ---- order type segment ----
  document.querySelectorAll('.seg button:not([disabled])').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.seg button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
    });
  });

  // ---- category nav: click + scrollspy ----
  function goto(id){
    const el=$('#cat-'+id); if(!el) return;
    if(window.lenis){ window.lenis.scrollTo(el,{offset:-90}); return; }
    // Instant positional scroll — the only form that reliably moves the page on
    // mobile Safari ({behavior:'smooth'} and rAF are flaky there).
    const target = Math.max(0, el.getBoundingClientRect().top + (window.scrollY||window.pageYOffset||0) - 84);
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

  // ---- checkout (pickup) ----
  $('#checkout-btn').addEventListener('click',()=>{
    const sub=subtotal(), tax=sub*TAX;
    const lines=cart.map(i=>`${i.qty}× ${i.name} — ${money(i.qty*i.price)}`).join('%0a');
    const msg=`Bombay Grill — PICKUP order%0a%0a${lines}%0a%0aSubtotal ${money(sub)}%0aTax ${money(tax)}%0aTotal ${money(sub+tax)}`;
    // No backend yet: open SMS to the restaurant with the order pre-filled (works on mobile),
    // and show a confirmation note. Real online payment + Snappy delivery wired later.
    window.location.href=`sms:+15144213522?&body=${msg}`;
  });
})();

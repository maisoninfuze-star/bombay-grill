/* Bombay Grill — orders dashboard (prototype).
   Reads orders placed on this device (localStorage 'bg_orders_v1'); seeds realistic
   samples if empty. Real cross-device orders will come from the backend/Snappy later. */
(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const KEY='bg_orders_v1';
  const money=n=>'$'+(n||0).toFixed(2);
  const STATUSES=['new','preparing','ready','completed'];
  const LABEL={new:'New',preparing:'Preparing',ready:'Ready',completed:'Completed'};
  const NEXT={new:'preparing',preparing:'ready',ready:'completed'};
  const NEXTLABEL={new:'Start preparing',preparing:'Mark ready',ready:'Complete'};

  let orders=[];
  try{ orders=JSON.parse(localStorage.getItem(KEY))||[]; }catch{}
  if(!orders.length){ orders=seed(); localStorage.setItem(KEY,JSON.stringify(orders)); }
  const save=()=>localStorage.setItem(KEY,JSON.stringify(orders));

  let filter='active'; // active = new+preparing+ready

  function seed(){
    const now=Date.now(), m=60000;
    const mk=(id,mins,name,phone,items,status,type)=>{
      const sub=items.reduce((s,i)=>s+i.qty*i.price,0), tax=sub*0.14975;
      return {id,ts:now-mins*m,name,phone,type:type||'Pickup',items,subtotal:sub,tax,total:sub+tax,status};
    };
    return [
      mk('BG-2047',3,'Aman S.','(514) 555-0142',[{name:'Butter Chicken',qty:1,price:14.99},{name:'Garlic Naan',qty:2,price:2.99},{name:'Chicken Biryani',qty:1,price:11.99}],'new'),
      mk('BG-2046',9,'Priya K.','(514) 555-0198',[{name:'Shahi Paneer',qty:1,price:12.99},{name:'Naan',qty:3,price:1.99},{name:'Mango Lassi',qty:2,price:5.99}],'preparing'),
      mk('BG-2045',14,'Jaspreet','(514) 555-0111',[{name:'Baby Goat Karahi (1kg)',qty:1,price:55.99},{name:'Butter Naan',qty:4,price:2.99}],'preparing'),
      mk('BG-2044',22,'Marc D.','(514) 555-0176',[{name:'Chicken Tikka',qty:1,price:14.99},{name:'Seekh… Kebab',qty:1,price:13.99},{name:'Jeera Rice',qty:1,price:6.00}],'ready'),
      mk('BG-2043',41,'Sara M.','(514) 555-0133',[{name:'Vegetable Biryani',qty:1,price:9.99},{name:'Dal Makhni',qty:1,price:10.99},{name:'Gulab Jamun',qty:1,price:4.99}],'completed'),
      mk('BG-2042',58,'Ravi','(514) 555-0107',[{name:'Full Chicken',qty:1,price:21.99},{name:'Naan',qty:4,price:1.99},{name:'Raita',qty:1,price:2.99}],'completed'),
    ];
  }

  function timeAgo(ts){
    const s=Math.max(0,(Date.now()-ts)/1000);
    if(s<60) return 'just now';
    const mins=Math.floor(s/60); if(mins<60) return mins+' min ago';
    const h=Math.floor(mins/60); return h+' h ago';
  }
  function clock(ts){ const d=new Date(ts); return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }

  function render(){
    // stats (today)
    const startOfDay=new Date(); startOfDay.setHours(0,0,0,0);
    const today=orders.filter(o=>o.ts>=startOfDay.getTime());
    const revenue=today.reduce((s,o)=>s+o.total,0);
    const pending=orders.filter(o=>o.status==='new'||o.status==='preparing').length;
    const ready=orders.filter(o=>o.status==='ready').length;
    setText('#s-orders', today.length);
    setText('#s-revenue', money(revenue));
    setText('#s-pending', pending);
    setText('#s-ready', ready);
    setText('#s-avg', today.length?money(revenue/today.length):'$0.00');

    // filter counts
    const counts={active:0,new:0,preparing:0,ready:0,completed:0,all:orders.length};
    orders.forEach(o=>{ counts[o.status]++; if(o.status!=='completed') counts.active++; });
    document.querySelectorAll('.d-tab').forEach(t=>{ const f=t.dataset.f; const c=t.querySelector('.c'); if(c) c.textContent=counts[f]??0; t.classList.toggle('active',f===filter); });

    // list
    let list=orders.slice().sort((a,b)=>b.ts-a.ts);
    if(filter==='active') list=list.filter(o=>o.status!=='completed');
    else if(filter!=='all') list=list.filter(o=>o.status===filter);

    const root=$('#d-orders');
    if(!list.length){ root.innerHTML='<div class="d-empty">No orders here.</div>'; return; }
    root.innerHTML=list.map(o=>`
      <article class="d-order s-${o.status}">
        <div class="d-order__head">
          <div><span class="d-id">${o.id}</span> <span class="d-type">${o.type}</span></div>
          <span class="d-badge b-${o.status}">${LABEL[o.status]}</span>
        </div>
        <div class="d-cust">${o.name}${o.phone?` · <a href="tel:${o.phone.replace(/[^0-9+]/g,'')}">${o.phone}</a>`:''} <span class="d-time">· ${clock(o.ts)} (${timeAgo(o.ts)})</span></div>
        <ul class="d-items">${o.items.map(i=>`<li><span class="q">${i.qty}×</span> ${i.name}<span class="p">${money(i.qty*i.price)}</span></li>`).join('')}</ul>
        <div class="d-foot">
          <span class="d-total">Total <b>${money(o.total)}</b></span>
          <div class="d-actions">
            ${NEXT[o.status]?`<button class="d-btn d-adv" data-adv="${o.id}">${NEXTLABEL[o.status]} →</button>`:''}
            ${o.status!=='completed'?`<button class="d-btn d-ghost" data-cancel="${o.id}">Cancel</button>`:`<button class="d-btn d-ghost" data-reopen="${o.id}">Reopen</button>`}
          </div>
        </div>
      </article>`).join('');
  }
  function setText(sel,v){ const el=$(sel); if(el) el.textContent=v; }

  // actions
  document.addEventListener('click',e=>{
    const adv=e.target.closest('[data-adv]'), can=e.target.closest('[data-cancel]'), re=e.target.closest('[data-reopen]'), tab=e.target.closest('.d-tab');
    if(adv){ const o=orders.find(x=>x.id===adv.dataset.adv); if(o&&NEXT[o.status]){ o.status=NEXT[o.status]; save(); render(); } }
    else if(can){ const o=orders.find(x=>x.id===can.dataset.cancel); if(o){ o.status='completed'; save(); render(); } }
    else if(re){ const o=orders.find(x=>x.id===re.dataset.reopen); if(o){ o.status='preparing'; save(); render(); } }
    else if(tab){ filter=tab.dataset.f; render(); }
  });
  $('#d-refresh')?.addEventListener('click',()=>{ try{ orders=JSON.parse(localStorage.getItem(KEY))||orders; }catch{} render(); });
  $('#d-clear')?.addEventListener('click',()=>{ if(confirm('Clear all orders and reload sample data?')){ orders=seed(); save(); render(); } });

  render();
  // live refresh (time-ago + any new orders placed in another tab)
  setInterval(()=>{ try{ const fresh=JSON.parse(localStorage.getItem(KEY)); if(fresh&&fresh.length!==orders.length) orders=fresh; }catch{} render(); }, 15000);
})();

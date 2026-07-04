/* ============================================================
   Bombay Grill — motion layer
   GSAP + ScrollTrigger + Lenis. Recreates the sen-knife feel:
   intro reveal, smooth scroll, masked line reveals, parallax,
   pinned horizontal scroll, marquee.
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

/* ---------- Lenis smooth scroll (desktop only — native scroll on touch) ---------- */
let lenis;
function initLenis(){
  // Phones/tablets use native touch scrolling; Lenis can block it, so skip on touch/small screens.
  const isTouch = matchMedia('(hover: none), (pointer: coarse), (max-width: 900px)').matches;
  if(isTouch) return;
  lenis = new Lenis({ duration:1.15, easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)), smoothWheel:true });
  window.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t=>lenis.raf(t*1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- Stroke field (sen-knife signature draw-on) ---------- */
function buildStrokes(loader){
  const host=document.createElement('div'); host.className='l-strokes';
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg'); svg.setAttribute('class','l-svg'); svg.setAttribute('viewBox','0 0 1200 420');
  const N=52, cx=600, cy=210;
  for(let i=0;i<N;i++){
    // scatter across a wide band, biased toward centre — like blade/knife marks
    const x=140+Math.random()*920, y=70+Math.random()*280;
    const len=14+Math.random()*52, ang=Math.random()*Math.PI - Math.PI/2;
    const ln=document.createElementNS(ns,'line');
    ln.setAttribute('x1',x.toFixed(1)); ln.setAttribute('y1',y.toFixed(1));
    ln.setAttribute('x2',(x+Math.cos(ang)*len).toFixed(1)); ln.setAttribute('y2',(y+Math.sin(ang)*len).toFixed(1));
    // distance from centre → draw order (centre first)
    ln._d=Math.hypot(x-cx,y-cy);
    svg.appendChild(ln);
  }
  host.appendChild(svg); loader.appendChild(host);
  const lines=[...svg.querySelectorAll('line')].sort((a,b)=>a._d-b._d);
  lines.forEach(l=>{ const L=l.getTotalLength(); l.style.strokeDasharray=L; l.style.strokeDashoffset=L; });
  return lines;
}

/* ---------- Preloader intro ---------- */
function intro(){
  const loader = document.getElementById('loader');
  if(!loader){ start(); revealTransition(); return; }
  document.body.classList.add('is-loading');
  if(lenis) lenis.stop();

  const strokes = buildStrokes(loader);
  const counter = { v:0 };
  // safety: never leave the page scroll-locked if the intro is interrupted (e.g. backgrounded tab on mobile)
  const failsafe = setTimeout(()=>{ document.body.classList.remove('is-loading'); loader.style.display='none'; if(lenis) lenis.start(); }, 7000);
  const tl = gsap.timeline({ onComplete:()=>{ clearTimeout(failsafe); document.body.classList.remove('is-loading'); if(lenis) lenis.start(); start(); }});

  // 1. strokes draw on from the centre out
  tl.to(strokes, { strokeDashoffset:0, duration:.9, ease:'power2.out', stagger:{each:.012, from:'start'} }, .15)
    .to(counter, { v:100, duration:1.5, ease:'power2.inOut', onUpdate(){ const c=loader.querySelector('.l-count'); if(c) c.textContent=Math.round(counter.v); } }, .15)
    .to('.l-bar', { width:'100%', duration:1.5, ease:'power2.inOut' }, .15)
  // 2. strokes fade as the wordmark rises through them
    .to(strokes, { opacity:0, duration:.6, ease:'power2.in', stagger:{each:.006, from:'edges'} }, '+=.15')
    .to(loader.querySelectorAll('.l-mark span, .l-sub span'), { y:0, duration:1.0, ease:'expo.out', stagger:.06 }, '-=.5')
  // 3. exit
    .to(loader.querySelectorAll('.l-mark span, .l-sub span'), { y:'-110%', duration:.7, ease:'expo.in', stagger:.04 }, '+=.35')
    .to(loader, { yPercent:-100, duration:1.0, ease:'expo.inOut' }, '-=.15')
    .set(loader, { display:'none' });

  // hero rises in parallel with the curtain
  tl.from('[data-hero]', { y:60, opacity:0, duration:1.1, ease:'expo.out', stagger:.08 }, '-=.7')
    .from('.hp-panel img, .hero__media img', { scale:1.3, duration:1.6, ease:'expo.out' }, '<');
}

/* ---------- Scroll-triggered reveals ---------- */
function start(){
  // masked line reveals
  gsap.utils.toArray('.line-mask').forEach(el=>{
    gsap.to(el.children, {
      y:0, duration:1.1, ease:'expo.out', stagger:.08,
      scrollTrigger:{ trigger:el, start:'top 88%' }
    });
  });
  // generic fade/slide reveals
  gsap.utils.toArray('[data-reveal]').forEach(el=>{
    const d = el.dataset.reveal;
    const from = d==='left'?{x:-50}: d==='right'?{x:50}: {y:50};
    gsap.fromTo(el, {opacity:0, ...from},
      { opacity:1, x:0, y:0, duration:1.2, ease:'expo.out', delay:(+el.dataset.delay||0),
        scrollTrigger:{ trigger:el, start:'top 86%' }});
  });
  // clip-wipe + scale image reveal (sen-knife style mask)
  gsap.utils.toArray('[data-img-reveal],[data-clip]').forEach(img=>{
    gsap.fromTo(img, { clipPath:'inset(100% 0 0 0)', scale:1.2 },
      { clipPath:'inset(0% 0 0 0)', scale:1, duration:1.5, ease:'expo.out',
        scrollTrigger:{ trigger:img, start:'top 88%' }});
  });
  // counters
  gsap.utils.toArray('[data-count]').forEach(el=>{
    const end=+el.dataset.count, obj={v:0};
    gsap.to(obj,{ v:end, duration:2, ease:'power2.out',
      scrollTrigger:{trigger:el,start:'top 90%'},
      onUpdate(){ el.textContent = Math.round(obj.v) + (el.dataset.suffix||''); }});
  });
  parallax();
  marquee();
  pinnedHero();
  pinnedDishes();
  ScrollTrigger.refresh();
}

/* ---------- Pinned horizontal HERO (sen-knife style) ---------- */
function pinnedHero(){
  const sec=document.querySelector('[data-hero-pin]');
  if(!sec) return;
  const track=sec.querySelector('.hero-pin__track');
  const head=sec.querySelector('.hp-head');
  ScrollTrigger.matchMedia({ '(min-width:768px)': ()=>{
    const dist=()=> Math.max(0, track.scrollWidth - window.innerWidth);
    // pin the hero & pan the photographic track horizontally as you scroll
    const st=gsap.to(track,{ x:()=>-dist(), ease:'none',
      scrollTrigger:{ trigger:sec, start:'top top', end:()=>'+='+dist(),
        scrub:1, pin:true, anticipatePin:1, invalidateOnRefresh:true }});
    // headline drifts at a slower rate (depth) while images pan behind it
    gsap.to(head,{ x:()=>dist()*0.12, ease:'none',
      scrollTrigger:{ trigger:sec, start:'top top', end:()=>'+='+dist(), scrub:1 }});
    // each photo gets internal scale-parallax as it crosses the viewport
    sec.querySelectorAll('.hp-panel img').forEach(img=>{
      gsap.fromTo(img,{ scale:1.14 },{ scale:1, ease:'none',
        scrollTrigger:{ trigger:img, containerAnimation:st, start:'left right', end:'right left', scrub:true }});
    });
  }});
}

/* ---------- Parallax (scroll + mouse) ---------- */
function parallax(){
  // scroll parallax on backgrounds / images
  gsap.utils.toArray('[data-parallax]').forEach(el=>{
    const amt = parseFloat(el.dataset.parallax)||-12; // percent
    gsap.fromTo(el, { yPercent: -amt/2 }, { yPercent: amt/2, ease:'none',
      scrollTrigger:{ trigger:el.closest('section')||el, start:'top bottom', end:'bottom top', scrub:true }});
  });
  // text translate parallax
  gsap.utils.toArray('[data-text-parallax]').forEach(el=>{
    const amt=parseFloat(el.dataset.textParallax)||80;
    gsap.fromTo(el,{y:amt},{y:-amt,ease:'none',
      scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:true}});
  });
  // mouse-move parallax (hero)
  const items=gsap.utils.toArray('[data-mouse]');
  if(items.length){
    window.addEventListener('mousemove', e=>{
      const x=(e.clientX/window.innerWidth-.5), y=(e.clientY/window.innerHeight-.5);
      items.forEach(it=>{ const s=parseFloat(it.dataset.mouse)||20;
        gsap.to(it,{ x:x*s, y:y*s, duration:.9, ease:'power3.out' }); });
    });
  }
}

/* ---------- Marquee ---------- */
function marquee(){
  gsap.utils.toArray('.marquee__track').forEach(track=>{
    const dir = track.dataset.dir==='right'?1:-1;
    // duplicate for seamless loop
    track.innerHTML += track.innerHTML;
    gsap.to(track,{ xPercent:50*dir, duration:24, ease:'none', repeat:-1 });
  });
}

/* ---------- Pinned horizontal dishes ---------- */
function pinnedDishes(){
  const sec=document.querySelector('[data-pin-scroll]');
  if(!sec) return;
  const track=sec.querySelector('.dishes__track');
  if(!track) return;
  const setup=()=>{
    const dist = track.scrollWidth - sec.querySelector('.wrap').offsetWidth;
    if(dist<=0) return;
    gsap.to(track,{ x:-dist, ease:'none',
      scrollTrigger:{ trigger:sec, start:'top top', end:()=>'+='+dist, scrub:1, pin:true, invalidateOnRefresh:true }});
  };
  // only pin on wider screens
  ScrollTrigger.matchMedia({ '(min-width:981px)': setup });
}

/* ---------- Page transition panel ---------- */
let transEl;
function buildTransition(){
  transEl=document.createElement('div'); transEl.className='page-trans';
  transEl.innerHTML='<i></i><b>Bombay Grill</b>';
  document.body.appendChild(transEl);
}
function revealTransition(){ /* play uncover on fresh load if panel left covering (back-nav) */ }
function coverAndGo(href){
  if(!transEl){ location.href=href; return; }
  if(lenis) lenis.stop();
  gsap.timeline({ onComplete:()=>{ location.href=href; }})
    .set(transEl,{transform:'translateY(100%)'})
    .to(transEl,{transform:'translateY(0%)',duration:.7,ease:'expo.inOut'})
    .to(transEl.querySelector('b'),{opacity:1,duration:.5,ease:'power2.out'},'-=.3');
}

/* ---------- Header / nav ---------- */
function nav(){
  buildTransition();
  const burger=document.querySelector('.burger'), drawer=document.querySelector('.drawer');
  if(burger&&drawer){
    burger.addEventListener('click',()=>drawer.classList.add('open'));
    drawer.querySelector('.close')?.addEventListener('click',()=>drawer.classList.remove('open'));
    drawer.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>drawer.classList.remove('open')));
  }
  // anchor smooth scroll via lenis
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{ const t=document.querySelector(a.getAttribute('href'));
      if(t){ e.preventDefault(); lenis?lenis.scrollTo(t,{offset:-60}):t.scrollIntoView({behavior:'smooth'}); }});
  });
  // internal page nav → cover transition (sen-knife Highway feel)
  document.querySelectorAll('a[href$=".html"]').forEach(a=>{
    const href=a.getAttribute('href');
    // skip current page links that are just the active one
    a.addEventListener('click',e=>{
      if(a.target==='_blank'||e.metaKey||e.ctrlKey) return;
      e.preventDefault(); coverAndGo(href);
    });
  });
}

/* ---------- boot ---------- */
window.addEventListener('DOMContentLoaded',()=>{
  initLenis();
  nav();
  intro();
});
window.addEventListener('load',()=>ScrollTrigger.refresh());

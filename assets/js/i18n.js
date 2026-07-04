/* Bombay Grill — bilingual EN/FR toggle.
   Tag elements with data-i18n="key" (text) or data-i18n-html="key" (markup).
   The order page reacts to the 'bg:lang' event to re-render item/category names. */
(function(){
  const DICT = {
    // ---- nav / common ----
    nav_home:{en:"Home",fr:"Accueil"}, nav_menu:{en:"Menu",fr:"Menu"},
    nav_order:{en:"Order",fr:"Commander"}, nav_catering:{en:"Catering",fr:"Traiteur"},
    nav_visit:{en:"Visit",fr:"Nous trouver"}, cta_order:{en:"Order online",fr:"Commander"},
    call_us:{en:"Call us",fr:"Appelez-nous"},
    // ---- footer (shared) ----
    f_hours:{en:"Hours",fr:"Heures"}, f_findus:{en:"Find us",fr:"Nous trouver"},
    f_getintouch:{en:"Get in touch",fr:"Contact"}, f_more:{en:"More",fr:"Plus"},
    f_orderhelp:{en:"Order help",fr:"Aide commande"},
    f_viewmenu:{en:"View menu",fr:"Voir le menu"}, f_fullmenu:{en:"Full menu",fr:"Menu complet"},
    f_catering:{en:"Catering",fr:"Traiteur"},
    hours_mon:{en:"Mon – Thu · 11:30 – 22:00",fr:"Lun – Jeu · 11:30 – 22:00"},
    hours_fri:{en:"Fri – Sat · 11:30 – 23:00",fr:"Ven – Sam · 11:30 – 23:00"},
    hours_sun:{en:"Sunday · 12:00 – 22:00",fr:"Dimanche · 12:00 – 22:00"},
    hours_note:{en:"*Please confirm seasonal hours",fr:"*Veuillez confirmer les heures saisonnières"},
    halal_tag:{en:"Serving India on your plate ✦ Halal kitchen",fr:"L'Inde dans votre assiette ✦ Cuisine halal"},
    // ---- home ----
    h_hero_eyebrow:{en:"Pierrefonds · Quebec",fr:"Pierrefonds · Québec"},
    h_hero_title:{en:'Serving India<br>on your <span class="serif-accent italic">plate</span>',fr:"L'Inde dans<br>votre <span class=\"serif-accent italic\">assiette</span>"},
    h_hero_lead:{en:"A modern North Indian kitchen — slow-cooked curries, smoke-kissed tandoor and fresh-made mithai, crafted with the soul of Bombay.",fr:"Une cuisine nord-indienne moderne — currys mijotés, tandoor au charbon et mithai frais, préparés avec l'âme de Bombay."},
    h_hero_cta:{en:"Explore the menu",fr:"Voir le menu"},
    h_scroll:{en:"Scroll to explore",fr:"Défilez pour explorer"},
    h_story_eyebrow:{en:"Our story",fr:"Notre histoire"},
    h_story_t1:{en:"Recipes carried",fr:"Des recettes venues"},
    h_story_t2:{en:'from home <span class="serif-accent italic">kitchens</span>',fr:"des cuisines <span class=\"serif-accent italic\">familiales</span>"},
    h_story_lead:{en:"Every dish at Bombay Grill begins the way it would at home — whole spices toasted by hand, gravies simmered low and slow, breads pulled fresh from a blazing tandoor. We bring the warmth of an Indian family table to the West Island.",fr:"Chaque plat commence comme à la maison — épices entières grillées à la main, sauces mijotées longuement, pains sortis d'un tandoor brûlant. Nous apportons la chaleur d'une table familiale indienne dans l'Ouest-de-l'Île."},
    h_stat1:{en:"Dishes & sweets",fr:"Plats & sucreries"}, h_stat2:{en:"Halal kitchen",fr:"Cuisine halal"}, h_stat3:{en:"Made to order",fr:"Fait sur commande"},
    h_dishes_eyebrow:{en:"Signature plates",fr:"Plats signature"},
    h_dishes_title:{en:"From the grill & karahi",fr:"Du grill & karahi"},
    h_dishes_lead:{en:'A taste of what\'s cooking. <span class="serif-accent">Drag through</span> our house favourites.',fr:"Un aperçu de nos cuisines. <span class=\"serif-accent\">Faites défiler</span> nos favoris maison."},
    h_band_eyebrow:{en:"The craft",fr:"Le savoir-faire"},
    h_band_t1:{en:"Spice, ground",fr:"Les épices, moulues"},
    h_band_t2:{en:'the <span class="serif-accent italic">old way</span>',fr:"à <span class=\"serif-accent italic\">l'ancienne</span>"},
    h_band_lead:{en:"No shortcuts, no powders from a tin. We blend our own masalas in small batches so every curry tastes the way it should — layered, fragrant, unmistakably fresh.",fr:"Aucun raccourci, aucune poudre en boîte. Nous mélangeons nos masalas en petites quantités pour que chaque curry ait le goût qu'il doit avoir — riche, parfumé, résolument frais."},
    h_band_cta:{en:"Find us",fr:"Nous trouver"},
    h_sweets_eyebrow:{en:"Mithai counter",fr:"Comptoir à mithai"},
    h_sweets_title:{en:'Something <span class="serif-accent italic">sweet</span>',fr:"Une touche <span class=\"serif-accent italic\">sucrée</span>"},
    h_cta_eyebrow:{en:"Catering & events",fr:"Traiteur & événements"},
    h_cta_title:{en:'Feeding your <span class="serif-accent italic">gathering</span>',fr:"Régalez vos <span class=\"serif-accent italic\">invités</span>"},
    h_cta_lead:{en:"From intimate dinners to weddings of 500 — let our kitchen handle the feast, beautifully presented and delivered warm.",fr:"Des dîners intimes aux mariages de 500 convives — laissez notre cuisine préparer le festin, joliment présenté et livré chaud."},
    h_cta_btn:{en:"See catering packages",fr:"Voir les forfaits traiteur"},
    h_foot_title:{en:'<span class="serif-accent italic">Visit</span> us in<br>Pierrefonds',fr:"<span class=\"serif-accent italic\">Visitez</span>-nous à<br>Pierrefonds"},
    // ---- menu page ----
    m_eyebrow:{en:"Dine in · Takeout · Delivery",fr:"Sur place · À emporter · Livraison"},
    m_title:{en:'The <span class="serif-accent italic">Menu</span>',fr:"Le <span class=\"serif-accent italic\">Menu</span>"},
    m_lead:{en:"Hand-ground spices, slow gravies and a live charcoal tandoor. Here's a taste of the kitchen.",fr:"Épices moulues à la main, sauces mijotées et tandoor au charbon. Voici un aperçu de notre cuisine."},
    m_browse:{en:"Browse our full menu below — or open it full-screen / download a copy.",fr:"Parcourez notre menu complet ci-dessous — ou ouvrez-le en plein écran / téléchargez-le."},
    m_open:{en:"Open full menu",fr:"Ouvrir le menu complet"}, m_download:{en:"Download PDF",fr:"Télécharger le PDF"},
    m_foot_title:{en:'<span class="serif-accent italic">Hungry?</span><br>Order now',fr:"<span class=\"serif-accent italic\">Faim ?</span><br>Commandez"},
    // ---- order page ----
    o_eyebrow:{en:"Order online",fr:"Commander en ligne"},
    o_title:{en:'Order for <span class="serif-accent italic">pickup</span>',fr:"Commander pour <span class=\"serif-accent italic\">emporter</span>"},
    o_lead:{en:"Freshly made to order. Ready at 4771 Sources Blvd, Pierrefonds — usually in 15–25 min.",fr:"Préparé sur commande. Prêt au 4771 boul. des Sources, Pierrefonds — généralement en 15–25 min."},
    o_pickup:{en:"Pickup",fr:"À emporter"}, o_delivery:{en:"Delivery",fr:"Livraison"},
    o_snappy:{en:'Delivery via <b style="color:var(--gold-soft)">Snappy</b> arrives soon. Pickup available now.',fr:"La livraison via <b style=\"color:var(--gold-soft)\">Snappy</b> arrive bientôt. À emporter disponible maintenant."},
    o_bag:{en:"Your bag",fr:"Votre panier"},
    o_subtotal:{en:"Subtotal",fr:"Sous-total"}, o_taxes:{en:"Taxes (GST+QST)",fr:"Taxes (TPS+TVQ)"}, o_total:{en:"Total",fr:"Total"},
    o_place:{en:"Place pickup order",fr:"Passer la commande"},
    o_note:{en:"Sends your order by text to the restaurant to confirm. Online payment & Snappy delivery coming soon.",fr:"Envoie votre commande par texto au restaurant pour confirmation. Paiement en ligne et livraison Snappy bientôt."},
    o_foot_title:{en:'<span class="serif-accent italic">Pick up</span><br>in Pierrefonds',fr:"<span class=\"serif-accent italic\">À emporter</span><br>à Pierrefonds"},
    // ---- catering page ----
    c_hero_eyebrow:{en:"Catering & events",fr:"Traiteur & événements"},
    c_hero_title:{en:'Feeding your<br><span class="serif-accent italic">gathering</span>',fr:"Régalez vos<br><span class=\"serif-accent italic\">invités</span>"},
    c_hero_lead:{en:"Weddings, corporate lunches, birthdays & festivals — across Pierrefonds and the West Island. Authentic flavours, generous portions, delivered warm and beautifully presented.",fr:"Mariages, dîners d'entreprise, anniversaires & fêtes — à Pierrefonds et dans l'Ouest-de-l'Île. Saveurs authentiques, portions généreuses, livrées chaudes et joliment présentées."},
    c_hero_cta:{en:"Request a quote",fr:"Demander une soumission"},
    c_why:{en:"Why us",fr:"Pourquoi nous"},
    c_why_t1:{en:"A feast worth",fr:"Un festin"},
    c_why_t2:{en:'<span class="serif-accent italic">remembering</span>',fr:"<span class=\"serif-accent italic\">mémorable</span>"},
    c_why_lead:{en:"From a boardroom of twenty to a banquet of five hundred, our kitchen scales without losing the soul of home cooking. Live counters, halal options and full setup available.",fr:"D'une salle de vingt à un banquet de cinq cents, notre cuisine s'adapte sans perdre l'âme de la cuisine maison. Comptoirs sur place, options halal et installation complète."},
    c_stat1:{en:"Guests catered",fr:"Convives servis"}, c_stat2:{en:"Notice preferred",fr:"Préavis souhaité"}, c_stat3:{en:"Halal options",fr:"Options halal"},
    c_pk_eyebrow:{en:"Packages",fr:"Forfaits"},
    c_pk_title:{en:'Choose your <span class="serif-accent italic">spread</span>',fr:"Choisissez votre <span class=\"serif-accent italic\">festin</span>"},
    c_steps_eyebrow:{en:"How it works",fr:"Comment ça marche"},
    c_steps_title:{en:'From enquiry to <span class="serif-accent italic">feast</span>',fr:"De la demande au <span class=\"serif-accent italic\">festin</span>"},
    c_form_eyebrow:{en:"Request a quote",fr:"Demander une soumission"},
    c_form_title:{en:"Let's plan<br>your <span class=\"serif-accent italic\">event</span>",fr:"Planifions<br>votre <span class=\"serif-accent italic\">événement</span>"},
    c_send:{en:"Send enquiry",fr:"Envoyer la demande"},
  };

  const KEY='bg_lang';
  const get=()=>localStorage.getItem(KEY)||'en';
  function apply(l){
    document.documentElement.lang=l;
    document.querySelectorAll('[data-i18n]').forEach(el=>{const d=DICT[el.getAttribute('data-i18n')]; if(d&&d[l]!=null) el.textContent=d[l];});
    document.querySelectorAll('[data-i18n-html]').forEach(el=>{const d=DICT[el.getAttribute('data-i18n-html')]; if(d&&d[l]!=null) el.innerHTML=d[l];});
    document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active', b.dataset.lang===l));
    window.BG_LANG=l;
    window.dispatchEvent(new CustomEvent('bg:lang',{detail:l}));
  }
  function set(l){ localStorage.setItem(KEY,l); apply(l); }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-lang]'); if(b){e.preventDefault(); set(b.dataset.lang);}});
  window.BG_LANG=get();
  document.addEventListener('DOMContentLoaded',()=>apply(get()));
  // expose for order.js
  window.bgI18n={get, DICT};
})();

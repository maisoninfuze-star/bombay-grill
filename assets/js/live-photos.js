/* Applies published photo versions (from the staff dashboard) so replaced images
   refresh immediately on static pages. overrides.json -> photos[<slug>] = <version>.
   Matches any <img> whose src is assets/photos/(full|thumb)/<slug>.<ext> and, if a
   version exists for that slug, appends ?v=<version> to bust the browser cache. */
(function () {
  fetch('assets/data/overrides.json?_=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var photos = (j && j.photos) || {};
      if (!Object.keys(photos).length) return;
      document.querySelectorAll('img[src*="assets/photos/"]').forEach(function (img) {
        var m = (img.getAttribute('src') || '').match(/assets\/photos\/(?:full|thumb)\/([a-z0-9-]+)\.(?:jpg|jpeg|png|webp)/i);
        if (!m) return;
        var v = photos[m[1]];
        if (v == null) return;
        var src = img.getAttribute('src');
        img.setAttribute('src', src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=' + v);
      });
    })
    .catch(function () {});
})();

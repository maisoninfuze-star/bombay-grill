# Bombay Grill & Sweets — website

Animated marketing site for **Bombay Grill & Sweets** (4771 Sources Blvd, Pierrefonds,
QC · 514 421 3522). Warm-spice-luxury direction, motion modelled on the sen-knife
reference (GSAP intro reveal, Lenis smooth scroll, masked line reveals, parallax,
pinned horizontal dish scroll, marquee). All imagery is AI-generated with Fal.ai.

## Run

```bash
python3 -m http.server 8200      # http://localhost:8200/index.html
```
Pure static HTML/CSS/JS — host anywhere (Netlify, Vercel, any web server).

## Pages
- `index.html` — home: hero, marquee, story, signature dishes (pinned scroll), craft band, sweets gallery, catering CTA, footer
- `menu.html` — menu page with an **upload placeholder** + editable sample menu
- `catering.html` — packages, process, sweet-table band, and an enquiry form

## Structure
```
assets/css/style.css   design system + layout + responsive
assets/js/app.js       GSAP + Lenis motion layer
assets/img/*.jpg        11 Fal.ai creatives (flux/dev)
gen-images.mjs          regenerate/extend imagery (needs FAL_KEY)
```

## Regenerate / add images
```bash
set -a && source ~/Claude/Projects/shared-keys/fal.env && set +a
node gen-images.mjs     # edit the `jobs` array to change prompts
```

## TODO / placeholders to confirm
- **Menu:** real dishes & prices are placeholders. When the official menu arrives,
  drop a PDF at `assets/menu/` and wire the button in `menu.html` (commented TODO there),
  or replace the sample `.menu-cat` blocks.
- **Hours:** footer hours are reasonable placeholders — confirm the real ones.
- **Catering form:** currently falls back to `mailto:`. Wire to a real endpoint
  (Formspree / Netlify Forms / backend) before launch.
- **Catering package prices** are samples — confirm.
- Add a real logo/favicon if available (currently text logo only).

## Notes
- Fonts: Cormorant Garamond (display) + Hind (body) via Google Fonts.
- GSAP, ScrollTrigger and Lenis are loaded from CDN.
- Respects `prefers-reduced-motion`.

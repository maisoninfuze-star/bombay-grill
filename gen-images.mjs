// Generate Bombay Grill creatives via Fal.ai (flux/dev) — warm spice luxury direction.
// Usage: source ~/Claude/Projects/shared-keys/fal.env && node gen-images.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const KEY = process.env.FAL_KEY;
if (!KEY) { console.error('FAL_KEY not set'); process.exit(1); }
const OUT = join(import.meta.dirname, 'assets', 'img');
await mkdir(OUT, { recursive: true });

const MODEL = 'fal-ai/flux/dev';
const LOOK = 'cinematic dark moody food photography, deep charcoal and maroon background, dramatic warm rim lighting, saffron and gold tones, rising steam, shallow depth of field, ultra realistic, fine-dining editorial, 8k, professional';

const jobs = [
  ['hero-feast', `overhead flat lay of a luxurious North Indian feast on dark slate, butter chicken, biryani, naan, raita, scattered saffron and marigold petals, brass thali bowls, ${LOOK}`, 'landscape_16_9'],
  ['hero-curry', `extreme close up of rich creamy butter chicken curry in a copper karahi, glistening sauce, fresh cream swirl, coriander, ${LOOK}`, 'landscape_16_9'],
  ['dish-biryani', `aromatic hyderabadi chicken biryani in a copper handi, fluffy saffron basmati rice, fried onions, mint, steam rising, ${LOOK}`, 'portrait_4_3'],
  ['dish-tandoori', `sizzling tandoori chicken tikka and seekh kebab on a cast iron platter with onions and lemon, charred edges, smoke, ${LOOK}`, 'portrait_4_3'],
  ['dish-paneer', `paneer tikka masala and palak paneer in dark ceramic bowls, golden ghee sheen, ${LOOK}`, 'portrait_4_3'],
  ['dish-breads', `basket of assorted indian breads garlic naan butter kulcha laccha paratha brushed with ghee, ${LOOK}`, 'portrait_4_3'],
  ['sweets-mithai', `assortment of premium indian sweets mithai gulab jamun jalebi kaju katli barfi on a dark plate with edible gold leaf and pistachio, ${LOOK}`, 'landscape_16_9'],
  ['ambiance', `warm intimate interior of an upscale modern indian restaurant, low pendant lighting, dark wood, brass accents, empty elegant table setting, bokeh, cinematic, ${LOOK}`, 'landscape_16_9'],
  ['catering-spread', `elegant indian catering buffet, long banquet table with copper chafing dishes and garnished platters, warm event lighting, abundance, ${LOOK}`, 'landscape_16_9'],
  ['chef-tandoor', `indian chef placing naan into a glowing tandoor clay oven, fiery orange glow, sparks, dramatic shadows, ${LOOK}`, 'portrait_4_3'],
  ['spice-texture', `top down scattered indian spices on black stone, turmeric red chili powder star anise cinnamon cardamom saffron threads, dramatic side light, ${LOOK}`, 'landscape_16_9'],
];

async function gen([name, prompt, size]) {
  const res = await fetch(`https://fal.run/${MODEL}`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: size, num_images: 1, num_inference_steps: 32, guidance_scale: 3.5, enable_safety_checker: false })
  });
  if (!res.ok) { console.error(`FAIL ${name}: ${res.status} ${await res.text()}`); return; }
  const data = await res.json();
  const url = data.images?.[0]?.url;
  if (!url) { console.error(`FAIL ${name}: no url`, JSON.stringify(data).slice(0,200)); return; }
  const img = Buffer.from(await (await fetch(url)).arrayBuffer());
  await writeFile(join(OUT, `${name}.jpg`), img);
  console.log(`OK ${name}.jpg  ${(img.length/1024|0)}KB`);
}

// Run with limited concurrency (3 at a time)
const queue = [...jobs];
async function worker() { while (queue.length) await gen(queue.shift()); }
await Promise.all([worker(), worker(), worker()]);
console.log('=== image generation done ===');

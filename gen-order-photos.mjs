// Generate bestseller item photos in the REAL photoshoot style via Fal.ai nano-banana edit.
// Uses a real photo as a style reference so new dishes share the wood table, copper karahi & lighting.
// Run: set -a && source ~/Claude/Projects/shared-keys/fal.env && set +a && node gen-order-photos.mjs
import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const sh = promisify(execFile);

const KEY = process.env.FAL_KEY;
if (!KEY) { console.error('FAL_KEY not set'); process.exit(1); }
const DIR = import.meta.dirname;
const REFDIR = join(DIR, 'assets/photos/thumb');
const FULL = join(DIR, 'assets/photos/full');
const THUMB = join(DIR, 'assets/photos/thumb');
const MODEL = 'fal-ai/nano-banana/edit';

const STYLE = 'Keep EXACTLY the same warm wooden table background, the same soft bright studio lighting, the same serving vessel style and the same professional top-down food-photography styling as the reference image. Replace ONLY the food with: ';
const REF = { curry:'butter-chicken', rice:'chicken-biryani', bread:'naan', grill:'tandoori-chicken', plate:'kebab-platter', sweet:'gulab-jamun' };

const JOBS = [
 ['chicken-korma','curry','creamy mild chicken korma in a copper karahi, pale golden cashew-cream sauce, slivered almonds, cilantro'],
 ['lamb-korma','curry','lamb korma in a copper karahi, rich creamy golden sauce, cilantro'],
 ['chicken-vindaloo','curry','spicy red chicken vindaloo with potato chunks in a copper karahi'],
 ['chicken-tikka-masala','curry','chicken tikka masala in a copper karahi, orange-red creamy tomato sauce, cream swirl, cilantro'],
 ['chicken-bhuna','curry','chicken bhuna, thick dark spiced semi-dry curry with bell peppers and onions in a copper karahi'],
 ['chicken-jalfrezi','curry','chicken jalfrezi with bell peppers, onions and tomatoes in a copper karahi'],
 ['lamb-rogan-josh','curry','lamb rogan josh, deep red Kashmiri curry in a copper karahi, cilantro'],
 ['palak-paneer','curry','palak paneer, creamy green spinach curry with cubes of paneer cheese in a copper karahi'],
 ['malai-kofta','curry','malai kofta, fried vegetable dumplings in a creamy orange gravy in a copper karahi'],
 ['aloo-gobi','curry','aloo gobi, dry turmeric-yellow cauliflower and potato curry in a copper karahi, cilantro'],
 ['mattar-paneer','curry','mattar paneer, green peas and paneer cubes in a tomato curry in a copper karahi'],
 ['vegetable-korma','curry','mixed vegetable korma in a creamy sauce in a copper karahi'],
 ['butter-lamb','curry','butter lamb in a velvety orange tomato-cream sauce in a copper karahi, cream swirl'],
 ['fish-curry','curry','fish curry, chunks of fish in a spiced golden-red sauce in a copper karahi, cilantro'],
 ['shrimp-masala','curry','shrimp masala, prawns in a spiced onion-tomato sauce in a copper karahi'],
 ['chicken-manchurian','plate','Indo-Chinese chicken manchurian, glazed dark-brown saucy chicken with spring onions on a white plate'],
 ['lamb-biryani','rice','lamb biryani, saffron basmati rice with chunks of lamb, fried onions and mint on a white plate'],
 ['veg-biryani','rice','vegetable biryani, saffron basmati rice with mixed vegetables and herbs on a white plate'],
 ['cheese-naan','bread','golden cheese-stuffed naan bread brushed with butter, torn open slightly'],
 ['vegetable-pakora','plate','crispy vegetable pakora fritters piled on a white plate with mint chutney'],
 ['chana-samosa','plate','two golden samosas with spiced chickpea chana on a white plate'],
 ['onion-bhaji','plate','crispy onion bhaji fritters on a white plate with chutney'],
 ['spring-roll','plate','crispy vegetable spring rolls on a white plate with dipping sauce'],
 ['mango-lassi','curry','a tall glass of creamy yellow mango lassi on the wooden table (replace bowl with a glass)'],
 ['masala-tea','curry','a glass cup of masala chai tea with milk on the wooden table (replace bowl with a glass cup)'],
];

async function refDataUri(slug){
  const buf = await readFile(join(REFDIR, slug+'.jpg'));
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}
const refCache = {};
async function getRef(kind){ return refCache[kind] ??= await refDataUri(REF[kind]); }

async function gen([slug, kind, dish]){
  if (existsSync(join(FULL, slug+'.jpg'))) { console.log('skip (exists)', slug); return; }
  const ref = await getRef(kind);
  const res = await fetch(`https://fal.run/${MODEL}`, {
    method:'POST', headers:{ Authorization:`Key ${KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ prompt: STYLE + dish, image_urls:[ref], num_images:1, output_format:'jpeg' })
  });
  if(!res.ok){ console.error('FAIL', slug, res.status, (await res.text()).slice(0,160)); return; }
  const data = await res.json();
  const url = data.images?.[0]?.url;
  if(!url){ console.error('FAIL', slug, 'no url'); return; }
  const img = Buffer.from(await (await fetch(url)).arrayBuffer());
  const full = join(FULL, slug+'.jpg');
  await writeFile(full, img);
  await sh('sips', ['-Z','800','-s','format','jpeg','-s','formatOptions','78', full, '--out', join(THUMB, slug+'.jpg')]).catch(()=>{});
  console.log('OK', slug, (img.length/1024|0)+'KB');
}

const q=[...JOBS];
async function worker(){ while(q.length) await gen(q.shift()); }
await Promise.all([worker(),worker(),worker()]);
console.log('=== done ===');

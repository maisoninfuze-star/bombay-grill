// Generate photos for ALL remaining menu items in the real photoshoot style.
// Style-reference match via fal-ai/nano-banana/edit. Writes assets/js/photo-manifest.js at the end.
// Run: set -a && source ~/Claude/Projects/shared-keys/fal.env && set +a && node gen-all-photos.mjs
import { writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const sh = promisify(execFile);

const KEY = process.env.FAL_KEY;
if (!KEY) { console.error('FAL_KEY not set'); process.exit(1); }
const DIR = import.meta.dirname;
const REFDIR = join(DIR,'assets/photos/thumb'), FULL = join(DIR,'assets/photos/full'), THUMB = join(DIR,'assets/photos/thumb');
const MODEL = 'fal-ai/nano-banana/edit';

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

// load MENU_CATEGORIES from the data file
const code = await readFile(join(DIR,'assets/js/menu-data.js'),'utf8');
const MENU = new Function(code + '\nreturn MENU_CATEGORIES;')();

// already-done names (first 25 batch, custom slugs) + trivial packaged items to skip
const DONE = new Set(["Chicken Korma","Lamb Korma","Chicken Vindaloo","Chicken Tikka Masala","Chicken Bhuna","Chicken Jalfrezi","Lamb Rogan Josh","Palak Paneer","Malai Kofta","Aloo Gobi","Mattar Paneer","Vegetable Korma","Butter Lamb","Fish Curry","Shrimp Masala","Chicken Manchurian","Lamb Biryani","Vegetarian Biryani","Cheese Naan","Vegetable Pakora","Chana Samosa","Onion Bhaji","Spring Roll","Mango Lassi","Masala Tea"]);
const SKIP = new Set(["Soft Drink","Bottled Water","Perrier Water"]); // packaged/branded — tile is better

const REF = { curry:'butter-chicken', rice:'chicken-biryani', bread:'naan', grill:'tandoori-chicken', plate:'kebab-platter', sweet:'gulab-jamun' };
const STYLE = 'Professional Indian restaurant food photograph. Keep the SAME warm wooden table background and the SAME soft bright studio lighting and top-down styling as the reference image. Show ONLY this dish, nicely plated and garnished: ';

function planFor(catId, name){
  const karahi = /karahi/i.test(name);
  switch(catId){
    case 'meat': case 'veg': case 'seafood': case 'soya': return ['curry', name+', Indian curry served in a copper karahi bowl'];
    case 'biryani': return ['rice', name+', rice dish served on a white plate'];
    case 'breads': return ['bread', name+', fresh Indian bread'];
    case 'tandoori': return ['grill', name+', tandoor-grilled, on a plate with sliced onion and lemon'];
    case 'wraps': return ['plate', name+', served on a white plate'];
    case 'appetizers': return ['plate', name+', Indian appetizer plated on a white plate'];
    case 'sides': return ['plate', name+', small side served in a little bowl'];
    case 'desserts': return ['sweet', name+', Indian dessert plated nicely'];
    case 'combos': return ['rice', name+', a combo meal platter with rice, naan and curries'];
    case 'bbq': return karahi ? ['curry', name+', served in a large copper karahi'] : ['grill', name+', large mixed grill platter'];
    case 'drinks': return ['curry', name+', Indian drink served in a tall clear glass on the wooden table'];
    default: return ['curry', name];
  }
}

// build job list
const jobs=[];
for(const cat of MENU){
  for(const it of cat.items){
    if(it.img || DONE.has(it.n) || SKIP.has(it.n)) continue;
    const slug=slugify(it.n);
    if(existsSync(join(FULL,slug+'.jpg'))) continue; // idempotent
    const [refKind, desc]=planFor(cat.id, it.n);
    jobs.push({slug, refKind, desc});
  }
}
// de-dup by slug
const seen=new Set(); const JOBS=jobs.filter(j=>!seen.has(j.slug)&&seen.add(j.slug));
console.log('to generate:', JOBS.length);

const refCache={};
async function getRef(kind){ return refCache[kind] ??= 'data:image/jpeg;base64,'+(await readFile(join(REFDIR,REF[kind]+'.jpg'))).toString('base64'); }

async function gen(j){
  try{
    const ref=await getRef(j.refKind);
    const res=await fetch(`https://fal.run/${MODEL}`,{method:'POST',
      headers:{Authorization:`Key ${KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({prompt:STYLE+j.desc, image_urls:[ref], num_images:1, output_format:'jpeg'})});
    if(!res.ok){ console.error('FAIL',j.slug,res.status); return; }
    const url=(await res.json()).images?.[0]?.url; if(!url){ console.error('FAIL',j.slug,'no url'); return; }
    const img=Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(join(FULL,j.slug+'.jpg'),img);
    await sh('sips',['-Z','800','-s','format','jpeg','-s','formatOptions','78',join(FULL,j.slug+'.jpg'),'--out',join(THUMB,j.slug+'.jpg')]).catch(()=>{});
    console.log('OK',j.slug);
  }catch(e){ console.error('ERR',j.slug,e.message); }
}

const q=[...JOBS];
async function worker(){ while(q.length) await gen(q.shift()); }
await Promise.all([worker(),worker(),worker(),worker()]);

// write manifest of every thumb slug present
const files=(await readdir(THUMB)).filter(f=>f.endsWith('.jpg')).map(f=>f.replace(/\.jpg$/,''));
await writeFile(join(DIR,'assets/js/photo-manifest.js'),'window.PHOTO_SLUGS='+JSON.stringify(files.sort())+';\n');
console.log('=== done. manifest:',files.length,'slugs ===');

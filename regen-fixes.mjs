// Regenerate flagged AI photos with corrected + more natural ("human touch") prompts.
// Real photoshoot photos are NOT overwritten. Three real-but-mismapped items get dedicated new photos.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const sh = promisify(execFile);
const KEY = process.env.FAL_KEY;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const FULL = path.join(DIR,'assets/photos/full'), THUMB = path.join(DIR,'assets/photos/thumb');
const MODEL = 'fal-ai/nano-banana/edit';

const items = JSON.parse(await readFile(path.join(DIR,'_review/items.json'),'utf8'));
const miss = JSON.parse(await readFile(path.join(DIR,'_review/mismatches.json'),'utf8'));
const betterOf = {}; for (const m of miss) if (m.better && !betterOf[m.slug]) betterOf[m.slug] = m.better;
const catOf = {}; for (const it of items) catOf[it.slug] = it.cat;

const HUMAN = ' Make it look like a REAL, authentic restaurant photo taken by a person: warm wooden table, bright natural light, natural home-style plating with small believable imperfections, realistic food textures, appetizing and genuine — NOT glossy, plastic, or CGI-perfect.';
const REF = s => path.join(THUMB, s + '.jpg');

// ref (a known-good image whose look we keep) chosen per item type
const refFor = slug => {
  const c = catOf[slug] || '';
  if (['Meat Plates','Vegetarian','Seafood','Soya Chaap'].includes(c)) return 'lamb-rogan-josh';
  if (c === 'Tandoori') return 'tandoori-chicken';
  if (c === 'Biryani & Rice') return 'shrimp-biryani';
  if (c === 'Wraps & Burgers') return 'veggie-burger';
  if (c === 'Appetizers') return 'pani-puri';
  if (c === 'Sides') return 'pani-puri';
  if (c === 'Desserts & Sweets') return 'laddu';
  return 'lamb-rogan-josh';
};

// AI-generated mismatches to regenerate (real photoshoot slugs excluded)
const AI = ['crispy-mushrooms','lahori-fish','bhindi-bhaji','daal-tarka','paneer-purji','fish-tikka','mutton-tikka','burger-zinger','soya-chaap-tandoori','soya-chaap-chilli','boneless-lamb-curry','baby-goat-curry','chef-salad','mixed-pickles-achar','bombay-special-biryani','fish-biryani','garlic-rice'];

// real-but-mismapped -> dedicated new photos (menu-data will be repointed to these slugs)
const REMAP = [
  { slug:'shahi-paneer',  ref:'lamb-rogan-josh',  better: betterOf['karahi-paneer'] },
  { slug:'chicken-tikka', ref:'tandoori-chicken', better: betterOf['kebab-platter'] },
  { slug:'mini-platter',  ref:'tandoori-chicken', better: betterOf['meat-thali'] },
];

const jobs = [
  ...AI.map(slug => ({ slug, ref: refFor(slug), better: betterOf[slug] })),
  ...REMAP,
].filter(j => j.better);

console.log('regenerating', jobs.length, 'photos');

async function gen(j){
  try{
    const refB64 = 'data:image/jpeg;base64,' + (await readFile(REF(j.ref))).toString('base64');
    const prompt = 'Professional Indian restaurant food photograph. ' + j.better + HUMAN;
    const res = await fetch(`https://fal.run/${MODEL}`,{method:'POST',
      headers:{Authorization:`Key ${KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({prompt, image_urls:[refB64], num_images:1, output_format:'jpeg'})});
    if(!res.ok){ console.error('FAIL',j.slug,res.status); return; }
    const url=(await res.json()).images?.[0]?.url; if(!url){ console.error('FAIL',j.slug,'no url'); return; }
    const img=Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(path.join(FULL,j.slug+'.jpg'),img);
    await sh('sips',['-Z','800','-s','format','jpeg','-s','formatOptions','78',path.join(FULL,j.slug+'.jpg'),'--out',path.join(THUMB,j.slug+'.jpg')]).catch(()=>{});
    console.log('OK',j.slug);
  }catch(e){ console.error('ERR',j.slug,e.message); }
}
const q=[...jobs];
async function worker(){ while(q.length) await gen(q.shift()); }
await Promise.all([worker(),worker(),worker(),worker()]);

// refresh manifest
const files=(await readdir(THUMB)).filter(f=>f.endsWith('.jpg')).map(f=>f.replace(/\.jpg$/,''));
await writeFile(path.join(DIR,'assets/js/photo-manifest.js'),'window.PHOTO_SLUGS='+JSON.stringify(files.sort())+';\n');
console.log('=== done. manifest:',files.length,'slugs ===');

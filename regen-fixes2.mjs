// Second-pass regeneration: fix v2-audit flags (wrong dish + AI-fake looking).
import { readFile, writeFile, readdir, copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const sh = promisify(execFile);
const KEY = process.env.FAL_KEY;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const FULL = path.join(DIR,'assets/photos/full'), THUMB = path.join(DIR,'assets/photos/thumb');
const MODEL = 'fal-ai/nano-banana/edit';

const flags = JSON.parse(await readFile(path.join(DIR,'_review/mismatches2.json'),'utf8'));
const seen=new Set(); const uniq=flags.filter(f=>!seen.has(f.slug)&&seen.add(f.slug));

// back up the 2 real photos before overwriting
await mkdir(path.join(DIR,'_source/real-originals'),{recursive:true});
for(const s of ['daal-makhani','chana-masala']){
  const src=path.join(FULL,s+'.jpg'), dst=path.join(DIR,'_source/real-originals',s+'.jpg');
  if(existsSync(src)&&!existsSync(dst)){ await copyFile(src,dst); console.log('backed up real',s); }
}

// reference image (a known-good natural photo whose look we keep)
const REF = {
  'dynamite-chicken':'lahori-fish','dynamite-shrimp':'lahori-fish','vegetable-pakora':'lahori-fish',
  'paneer-pakora':'lahori-fish','veggie-manchurian':'lahori-fish','crispy-mushrooms':'lahori-fish',
  'chili-chicken':'lahori-fish','daal-makhani':'lamb-rogan-josh','chana-masala':'lamb-rogan-josh',
  'mushroom-balti':'lamb-rogan-josh','daal-tarka':'lamb-rogan-josh','veg-fried-rice':'shrimp-biryani',
};
const HUMAN=' Make it look like a REAL authentic photograph taken by a person in a restaurant: warm wooden table, bright natural light, natural imperfect home-style plating, realistic irregular textures and edges, believable — NOT smooth, waxy, glossy, plastic, or AI-perfect. Avoid uniform identical shapes.';

async function gen(f){
  try{
    const ref='data:image/jpeg;base64,'+(await readFile(path.join(THUMB,(REF[f.slug]||'lamb-rogan-josh')+'.jpg'))).toString('base64');
    const prompt='Professional but natural Indian restaurant food photograph. '+(f.better||f.name)+HUMAN;
    const res=await fetch(`https://fal.run/${MODEL}`,{method:'POST',headers:{Authorization:`Key ${KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({prompt, image_urls:[ref], num_images:1, output_format:'jpeg'})});
    if(!res.ok){ console.error('FAIL',f.slug,res.status); return; }
    const url=(await res.json()).images?.[0]?.url; if(!url){ console.error('FAIL',f.slug,'no url'); return; }
    const img=Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(path.join(FULL,f.slug+'.jpg'),img);
    await sh('sips',['-Z','800','-s','format','jpeg','-s','formatOptions','78',path.join(FULL,f.slug+'.jpg'),'--out',path.join(THUMB,f.slug+'.jpg')]).catch(()=>{});
    console.log('OK',f.slug,'['+f.verdict+']');
  }catch(e){ console.error('ERR',f.slug,e.message); }
}
console.log('regenerating',uniq.length,'photos');
const q=[...uniq]; async function w(){ while(q.length) await gen(q.shift()); }
await Promise.all([w(),w(),w(),w()]);

const files=(await readdir(THUMB)).filter(x=>x.endsWith('.jpg')).map(x=>x.replace(/\.jpg$/,''));
await writeFile(path.join(DIR,'assets/js/photo-manifest.js'),'window.PHOTO_SLUGS='+JSON.stringify(files.sort())+';\n');
console.log('=== done. manifest:',files.length,'===');

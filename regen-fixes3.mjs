// Third-pass regeneration: fix cross-reference-flagged photos with accurate + natural prompts.
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

const flags = JSON.parse(await readFile(path.join(DIR,'_review/xref.json'),'utf8'));
const seen=new Set(); const uniq=flags.filter(f=>!seen.has(f.slug)&&seen.add(f.slug));

// back up the 2 real photos before overwriting
await mkdir(path.join(DIR,'_source/real-originals'),{recursive:true});
for(const s of ['butter-chicken','naan']){
  const src=path.join(FULL,s+'.jpg'), dst=path.join(DIR,'_source/real-originals',s+'.jpg');
  if(existsSync(src)&&!existsSync(dst)){ await copyFile(src,dst); console.log('backed up real',s); }
}

const REF = {
  'chilli-fish':'soya-chaap-chilli',
  'lamb-vindaloo':'lamb-rogan-josh','lamb-jalfrezi':'lamb-rogan-josh','paneer-jalfrezie':'lamb-rogan-josh',
  'chicken-dhansak':'lamb-rogan-josh','malai-kofta':'lamb-rogan-josh','fish-tikka-masala':'lamb-rogan-josh',
  'butter-chicken':'lamb-rogan-josh',
  'dynamite-shrimp':'pani-puri','lahori-fish':'pani-puri',
  'amritsari-kulcha':'garlic-naan','potato-naan':'garlic-naan','onion-kulcha':'garlic-naan',
  'butter-naan':'garlic-naan','naan':'garlic-naan',
  'fish-biryani':'shrimp-biryani',
};
const HUMAN=' Make it look like a REAL authentic restaurant photograph on a warm wooden table with bright natural light — natural home-style plating, realistic irregular textures, appetizing, NOT waxy, plastic, glossy or AI-perfect.';

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

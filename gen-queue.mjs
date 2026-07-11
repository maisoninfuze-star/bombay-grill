// Regenerate via fal QUEUE API (queue.fal.run) since the sync host fal.run is unreachable.
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const sh = promisify(execFile);
const KEY = process.env.FAL_KEY;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const FULL = path.join(DIR,'assets/photos/full'), THUMB = path.join(DIR,'assets/photos/thumb');
const H = { Authorization:`Key ${KEY}`, 'Content-Type':'application/json' };
const sleep = ms => new Promise(r=>setTimeout(r,ms));

// Text-to-image (no brown-curry reference) so the gravy colour is right.
const jobs=[
 {slug:'shahi-paneer', model:'fal-ai/nano-banana', p:'Professional Indian restaurant food photograph on a warm dark-wood table with bright natural light, shallow depth of field. Shahi Paneer served in a shiny copper karahi bowl with brass handles: soft PURE-WHITE cubes of paneer (Indian cottage cheese) clearly visible and standing out, in a smooth glossy RICH CREAMY PALE-GOLDEN ivory Mughlai gravy (cashew-and-cream based, warm creamy off-white to light golden colour — appetizing and luxurious, absolutely NOT brown, muddy, grey or dark), finished with an elegant swirl of fresh cream, a scatter of slivered almonds and pistachios, a few saffron strands and fresh coriander. Realistic, natural, mouth-watering.'},
];

async function gen(j){
  const model = j.model || 'fal-ai/nano-banana/edit';
  const body = { prompt:j.p, num_images:1, output_format:'jpeg' };
  if(j.ref){ body.image_urls=['data:image/jpeg;base64,'+(await readFile(path.join(THUMB,j.ref+'.jpg'))).toString('base64')]; }
  const sub=await fetch(`https://queue.fal.run/${model}`,{method:'POST',headers:H,body:JSON.stringify(body)});
  if(!sub.ok){ console.log('SUBMIT FAIL',j.slug,sub.status,(await sub.text()).slice(0,120)); return; }
  const { status_url, response_url } = await sub.json();
  for(let i=0;i<90;i++){
    await sleep(2000);
    const st=await fetch(status_url,{headers:H}); const sj=await st.json();
    if(sj.status==='COMPLETED') break;
    if(sj.status==='FAILED'||sj.status==='ERROR'){ console.log('JOB FAIL',j.slug,JSON.stringify(sj).slice(0,120)); return; }
    if(i===89){ console.log('TIMEOUT',j.slug); return; }
  }
  const res=await fetch(response_url,{headers:H}); const rj=await res.json();
  const url=rj.images?.[0]?.url; if(!url){ console.log('NO URL',j.slug,JSON.stringify(rj).slice(0,120)); return; }
  const img=Buffer.from(await (await fetch(url)).arrayBuffer());
  await writeFile(path.join(FULL,j.slug+'.jpg'),img);
  await sh('sips',['-Z','800','-s','format','jpeg','-s','formatOptions','78',path.join(FULL,j.slug+'.jpg'),'--out',path.join(THUMB,j.slug+'.jpg')]).catch(()=>{});
  console.log('OK',j.slug);
}
for(const j of jobs) await gen(j);
console.log('done');

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
const MODEL = 'fal-ai/nano-banana/edit';
const H = { Authorization:`Key ${KEY}`, 'Content-Type':'application/json' };
const sleep = ms => new Promise(r=>setTimeout(r,ms));

const HUMAN=' Real authentic restaurant photograph on a warm wooden table, bright natural light, natural plating, realistic textures, appetizing, NOT waxy/plastic/AI-perfect.';
const jobs=[
 {slug:'shahi-paneer', ref:'lamb-rogan-josh', p:'Shahi paneer in a copper karahi: many soft CLEARLY WHITE paneer (cottage cheese) cubes bathed in a smooth, rich, MILD PALE creamy pinkish-orange tomato-cashew gravy (light and creamy, NOT dark brown), a swirl of cream, slivers of ginger and coriander. The white paneer cubes must be obvious against the pale gravy.'},
 {slug:'goat-karahi', ref:'lamb-rogan-josh', p:'Baby goat karahi in a copper karahi: several CHUNKY BONE-IN pieces of goat meat clearly visible in a thick reddish-brown bhuna karahi masala of tomato and onion, glossy oil on top, julienned ginger, green chili and coriander. Distinct meat chunks visible (not a smooth paste).'},
];

async function gen(j){
  const ref='data:image/jpeg;base64,'+(await readFile(path.join(THUMB,j.ref+'.jpg'))).toString('base64');
  const body={ prompt:'Professional but natural Indian restaurant food photograph. '+j.p+HUMAN, image_urls:[ref], num_images:1, output_format:'jpeg' };
  const sub=await fetch(`https://queue.fal.run/${MODEL}`,{method:'POST',headers:H,body:JSON.stringify(body)});
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

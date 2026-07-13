// Regenerate the audit-confirmed mismatched photos via fal QUEUE API.
// Reads _review/confirmed.json: [{slug, fixPrompt, genMode:'text'|'edit', refToUse?}]
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const sh = promisify(execFile);
const KEY = process.env.FAL_KEY;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const FULL = path.join(DIR, 'assets/photos/full'), THUMB = path.join(DIR, 'assets/photos/thumb');
const H = { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const jobs = JSON.parse(await readFile(path.join(DIR, '_review/confirmed.json'), 'utf8'));
const HUMAN = ' Shot as a REAL restaurant food photograph on a warm wooden table with bright natural light, authentic home-style plating, realistic irregular textures, appetizing — NOT waxy, plastic, glossy or AI-perfect.';

async function gen(j) {
  const useEdit = j.genMode === 'edit' && j.refToUse && existsSync(path.join(THUMB, j.refToUse + '.jpg'));
  const model = useEdit ? 'fal-ai/nano-banana/edit' : 'fal-ai/nano-banana';
  const body = { prompt: j.fixPrompt + HUMAN, num_images: 1, output_format: 'jpeg' };
  if (useEdit) body.image_urls = ['data:image/jpeg;base64,' + (await readFile(path.join(THUMB, j.refToUse + '.jpg'))).toString('base64')];
  const sub = await fetch(`https://queue.fal.run/${model}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  if (!sub.ok) { console.log('SUBMIT FAIL', j.slug, sub.status, (await sub.text()).slice(0, 140)); return; }
  const { status_url, response_url } = await sub.json();
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    const sj = await (await fetch(status_url, { headers: H })).json();
    if (sj.status === 'COMPLETED') break;
    if (sj.status === 'FAILED' || sj.status === 'ERROR') { console.log('JOB FAIL', j.slug, JSON.stringify(sj).slice(0, 140)); return; }
    if (i === 89) { console.log('TIMEOUT', j.slug); return; }
  }
  const rj = await (await fetch(response_url, { headers: H })).json();
  const url = rj.images?.[0]?.url; if (!url) { console.log('NO URL', j.slug); return; }
  const img = Buffer.from(await (await fetch(url)).arrayBuffer());
  await writeFile(path.join(FULL, j.slug + '.jpg'), img);
  await sh('sips', ['-Z', '800', '-s', 'format', 'jpeg', '-s', 'formatOptions', '78', path.join(FULL, j.slug + '.jpg'), '--out', path.join(THUMB, j.slug + '.jpg')]).catch(() => {});
  console.log('OK', j.slug, useEdit ? '(edit<-' + j.refToUse + ')' : '(text)');
}

console.log('regenerating', jobs.length, 'photos');
const q = [...jobs];
async function w() { while (q.length) await gen(q.shift()); }
await Promise.all([w(), w(), w(), w()]);
console.log('done');

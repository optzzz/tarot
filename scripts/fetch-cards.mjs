// 从 Wikimedia Commons 下载 1909 年韦特塔罗扫描图（公有领域），并压缩成网页用的两个尺寸。
// 原图缓存在 .cache/raw，输出到 public/cards/{lg,sm}/<id>.webp。重复运行会跳过已下载的文件。
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, '.cache', 'raw');
const OUT = path.join(ROOT, 'public', 'cards');
const UA = 'tarot-personal-app/0.1 (personal use)';

const MAJOR = ['Fool', 'Magician', 'High Priestess', 'Empress', 'Emperor', 'Hierophant', 'Lovers', 'Chariot',
  'Strength', 'Hermit', 'Wheel of Fortune', 'Justice', 'Hanged Man', 'Death', 'Temperance', 'Devil', 'Tower',
  'Star', 'Moon', 'Sun', 'Judgement', 'World'];
const SUITS = { w: 'Wands', c: 'Cups', s: 'Swords', p: 'Pents' };

const cards = [];
MAJOR.forEach((n, i) => {
  const nn = String(i).padStart(2, '0');
  cards.push({ id: `m${nn}`, title: `File:RWS Tarot ${nn} ${n}.jpg` });
});
for (const [k, name] of Object.entries(SUITS)) {
  for (let i = 1; i <= 14; i++) {
    const nn = String(i).padStart(2, '0');
    cards.push({ id: `${k}${nn}`, title: `File:${name}${nn}.jpg` });
  }
}

async function resolveUrls(list) {
  const map = new Map();
  for (let i = 0; i < list.length; i += 40) {
    const batch = list.slice(i, i + 40);
    const u = new URL('https://commons.wikimedia.org/w/api.php');
    u.search = new URLSearchParams({
      action: 'query', titles: batch.map(c => c.title).join('|'),
      prop: 'imageinfo', iiprop: 'url|size', format: 'json', formatversion: '2',
    });
    const res = await fetch(u, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    const norm = new Map((data.query.normalized ?? []).map(n => [n.to, n.from]));
    for (const p of data.query.pages) {
      const from = norm.get(p.title) ?? p.title;
      if (p.missing || !p.imageinfo) { console.warn('缺失:', from); continue; }
      map.set(from, p.imageinfo[0].url);
    }
  }
  return map;
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

await fs.mkdir(RAW, { recursive: true });
await fs.mkdir(path.join(OUT, 'lg'), { recursive: true });
await fs.mkdir(path.join(OUT, 'sm'), { recursive: true });

const urls = await resolveUrls(cards);
let n = 0;
for (const c of cards) {
  const url = urls.get(c.title);
  if (!url) continue;
  const raw = path.join(RAW, `${c.id}.jpg`);
  if (!(await exists(raw))) {
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) { await fs.writeFile(raw, Buffer.from(await res.arrayBuffer())); break; }
      if (attempt >= 8) throw new Error(`下载失败 ${c.title}: ${res.status}`);
      // 429 是 Commons 的限速，按 retry-after 等一会儿再试
      const wait = Number(res.headers.get('retry-after')) * 1000 || 5000 * attempt;
      await new Promise(r => setTimeout(r, wait));
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  // 统一成 0.578 的牌面比例，避免扫描尺寸差异让牌阵里的牌大小不一
  const img = sharp(raw).resize({ width: 1100, height: 1904, fit: 'cover', position: 'centre' });
  const buf = await img.toBuffer();
  await sharp(buf).resize({ width: 640 }).webp({ quality: 75, smartSubsample: true }).toFile(path.join(OUT, 'lg', `${c.id}.webp`));
  await sharp(buf).resize({ width: 280 }).webp({ quality: 78, smartSubsample: true }).toFile(path.join(OUT, 'sm', `${c.id}.webp`));
  n++;
  process.stdout.write(`\r${n}/${cards.length} ${c.id}   `);
}
console.log(`\n完成 ${n} 张`);

// 生成牌背 SVG 和应用图标。牌背与图标共用同一个中心图案：圆环 + 光芒 + 八芒星。
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOLD = '#c9a96a';
const f = n => +n.toFixed(2);

function star(cx, cy, outer, inner, points = 8) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(' ')}"/>`;
}

function rays(cx, cy, r0, count, long, short) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI / count) * i;
    const len = i % 2 ? short : long;
    d += `M${f(cx + r0 * Math.cos(a))} ${f(cy + r0 * Math.sin(a))}L${f(cx + (r0 + len) * Math.cos(a))} ${f(cy + (r0 + len) * Math.sin(a))}`;
  }
  return `<path d="${d}"/>`;
}

/** 中心图案，s 为缩放 */
function emblem(cx, cy, s, sw = 1) {
  return `
  <circle cx="${cx}" cy="${cy}" r="${f(44 * s)}" stroke-width="${f(0.9 * sw)}"/>
  <circle cx="${cx}" cy="${cy}" r="${f(39 * s)}" stroke-width="${f(0.45 * sw)}" stroke-opacity=".6"/>
  <g stroke-width="${f(0.7 * sw)}">${rays(cx, cy, 49 * s, 32, 9 * s, 4.5 * s)}</g>
  <g stroke-width="${f(0.8 * sw)}">${star(cx, cy, 33 * s, 12.5 * s)}</g>
  <g stroke-width="${f(0.5 * sw)}" stroke-opacity=".7">${star(cx, cy, 22 * s, 9 * s)}</g>
  <circle cx="${cx}" cy="${cy}" r="${f(4 * s)}" fill="${GOLD}" fill-opacity=".85" stroke="none"/>`;
}

function crescent(cx, cy, r, flip) {
  // 两段圆弧围成的月牙
  const dir = flip ? -1 : 1;
  return `<path d="M${f(cx - r)} ${cy} A${r} ${r} 0 0 ${flip ? 1 : 0} ${f(cx + r)} ${cy} A${f(r * 1.25)} ${f(r * 1.25)} 0 0 ${flip ? 0 : 1} ${f(cx - r)} ${cy}Z" transform="translate(0 ${f(dir * r * 0.15)})"/>`;
}

const W = 200, H = 346;
const back = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0" stop-color="#1a1f3d"/><stop offset="1" stop-color="#0d1024"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#3a3f78" stop-opacity=".55"/><stop offset="1" stop-color="#3a3f78" stop-opacity="0"/>
  </radialGradient>
  <pattern id="lat" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <path d="M0 0H12M0 0V12" stroke="${GOLD}" stroke-opacity=".085" stroke-width=".6" fill="none"/>
  </pattern>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="4" fill="url(#lat)"/>
<circle cx="100" cy="173" r="92" fill="url(#glow)"/>
<g fill="none" stroke="${GOLD}" stroke-linecap="round" stroke-linejoin="round">
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="4" stroke-width="1" stroke-opacity=".8"/>
  <rect x="15" y="15" width="${W - 30}" height="${H - 30}" rx="2.5" stroke-width=".45" stroke-opacity=".5"/>
  ${emblem(100, 173, 1)}
  <g stroke-width=".7" stroke-opacity=".85">
    ${crescent(100, 58, 9, false)}
    ${crescent(100, 288, 9, true)}
  </g>
  <g stroke-width=".5" stroke-opacity=".6">
    <path d="M100 76v12M100 258v12"/>
    <path d="M100 36l4 6-4 6-4-6zM100 298l4 6-4 6-4-6z"/>
  </g>
  <g stroke-width=".6" stroke-opacity=".55">
    <path d="M15 33a18 18 0 0 0 18-18M185 33a18 18 0 0 1-18-18M15 313a18 18 0 0 1 18 18M185 313a18 18 0 0 0-18 18"/>
  </g>
</g>
</svg>
`;
await fs.writeFile(path.join(ROOT, 'public', 'card-back.svg'), back);

// 应用图标：满版深色底（maskable 安全区内放图案）
function icon(size, pad) {
  const c = size / 2;
  const s = (size * (1 - pad * 2)) / 2 / 58;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
<defs>
  <radialGradient id="g" cx="50%" cy="45%" r="70%">
    <stop offset="0" stop-color="#252b55"/><stop offset="1" stop-color="#0c0f22"/>
  </radialGradient>
</defs>
<rect width="${size}" height="${size}" fill="url(#g)"/>
<g fill="none" stroke="${GOLD}" stroke-linecap="round" stroke-linejoin="round">${emblem(c, c, s, s * 1.6)}</g>
</svg>`;
}

const out = path.join(ROOT, 'public', 'icons');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'icon.svg'), icon(512, 0.1));
for (const [name, size, pad] of [['icon-192.png', 192, 0.1], ['icon-512.png', 512, 0.1], ['maskable-512.png', 512, 0.2], ['apple-touch-icon.png', 180, 0.12]]) {
  await sharp(Buffer.from(icon(size, pad)), { density: 300 }).resize(size, size).png().toFile(path.join(out, name));
}
console.log('done');

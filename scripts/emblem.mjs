// 牌背、网页图标、安卓图标共用的中心图案：圆环 + 光芒 + 八芒星
export const GOLD = '#c9a96a';
export const f = n => +n.toFixed(2);

export function star(cx, cy, outer, inner, points = 8) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(' ')}"/>`;
}

export function rays(cx, cy, r0, count, long, short) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI / count) * i;
    const len = i % 2 ? short : long;
    d += `M${f(cx + r0 * Math.cos(a))} ${f(cy + r0 * Math.sin(a))}L${f(cx + (r0 + len) * Math.cos(a))} ${f(cy + (r0 + len) * Math.sin(a))}`;
  }
  return `<path d="${d}"/>`;
}

/** 中心图案：s 为缩放，sw 为线宽倍数，color 为中心圆点颜色（线条颜色由外层 stroke 决定） */
export function emblem(cx, cy, s, sw = 1, color = GOLD) {
  return `
  <circle cx="${cx}" cy="${cy}" r="${f(44 * s)}" stroke-width="${f(0.9 * sw)}"/>
  <circle cx="${cx}" cy="${cy}" r="${f(39 * s)}" stroke-width="${f(0.45 * sw)}" stroke-opacity=".6"/>
  <g stroke-width="${f(0.7 * sw)}">${rays(cx, cy, 49 * s, 32, 9 * s, 4.5 * s)}</g>
  <g stroke-width="${f(0.8 * sw)}">${star(cx, cy, 33 * s, 12.5 * s)}</g>
  <g stroke-width="${f(0.5 * sw)}" stroke-opacity=".7">${star(cx, cy, 22 * s, 9 * s)}</g>
  <circle cx="${cx}" cy="${cy}" r="${f(4 * s)}" fill="${color}" fill-opacity=".85" stroke="none"/>`;
}

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { CARD_BACK, CARD_RATIO } from '../data/cards';
import type { DrawnCard } from '../lib/random';
import { prefersReducedMotion } from '../lib/hooks';

export interface FanGeo {
  fw: number;
  fh: number;
  /** 弧的半径与半张角 */
  R: number;
  alpha: number;
  lift: number;
  stackScale: number;
  pivotY: number;
  height: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function build(vw: number, fw: number, sRatio: number, sMax: number): FanGeo {
  const phone = vw < 640;
  const fh = fw * CARD_RATIO;
  // 两端牌中心之间的弦长：两端的牌是斜的，要按旋转后的外沿留边，避免超出屏幕
  const arc = (c: number) => {
    const s = clamp(c * sRatio, 24, sMax); // 弧高
    const R = (c * c) / 4 / (2 * s) + s / 2;
    return { s, R, alpha: Math.asin(c / 2 / R) };
  };
  let c = Math.min(vw - 32, 1100) - fw;
  for (let k = 0; k < 3; k++) {
    const { alpha } = arc(c);
    const reach = (fw / 2) * Math.cos(alpha) + (fh / 2) * Math.sin(alpha);
    c = Math.min(vw - 2 * (reach + 10), 1100 - fw);
  }
  const { R, alpha } = arc(c);
  const lift = fh * 0.3;
  const stackScale = phone ? 1.5 : 1.35;
  const topPad = Math.max(lift + fh / 2, (stackScale * fh) / 2 + 10) + 6;
  const pivotY = topPad + R;
  const bottom = pivotY - R * Math.cos(alpha) + (fw / 2) * Math.sin(alpha) + (fh / 2) * Math.cos(alpha);
  return { fw, fh, R, alpha, lift, stackScale, pivotY, height: Math.ceil(bottom + 12) };
}

/** 牌扇尺寸：按屏幕宽度定弧长，按屏幕高度限制总高（矮窗口里整体缩小，不被截掉） */
export function fanGeometry(vw: number, vh: number): FanGeo {
  const phone = vw < 640;
  const fw0 = phone ? 58 : 80;
  const sRatio = phone ? 0.2 : 0.13;
  const geo = build(vw, fw0, sRatio, 125);
  const maxH = vh * (phone ? 0.36 : 0.4);
  if (geo.height <= maxH) return geo;
  const k = Math.max(0.55, maxH / geo.height);
  return build(vw, fw0 * k, sRatio * k, 125 * k);
}

export interface FlyFrom {
  cx: number;
  cy: number;
  angle: number;
  w: number;
}

export type FanMode = 'stack' | 'spread' | 'gather';

interface Props {
  cards: DrawnCard[];
  geo: FanGeo;
  mode: FanMode;
  /** 能否挑牌 */
  interactive: boolean;
  onPick: (index: number, from: FlyFrom) => void;
  onStackClick?: () => void;
  /** 每次加一，触发一次洗牌动画 */
  shuffleSignal: number;
  onShuffleEnd: () => void;
}

// 所有状态下的 transform 都保持同一个函数结构，切换时浏览器才能逐项平滑插值
const tf = (x: number, y: number, rot: number, r: number, s: number, tilt: number) =>
  `translate(${x}px, ${y}px) rotate(${rot}deg) translateY(${-r}px) scale(${s}) rotate(${tilt}deg)`;

export function Fan({ cards, geo, mode, interactive, onPick, onStackClick, shuffleSignal, onShuffleEnd }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<string, HTMLDivElement>());
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);
  // 模式切换（展开、收拢）时用较长的过渡；平时悬停用短过渡
  const [moving, setMoving] = useState(false);
  const prevMode = useRef(mode);

  useLayoutEffect(() => {
    if (prevMode.current === mode) return;
    prevMode.current = mode;
    setHover(null);
    setMoving(true);
    const t = setTimeout(() => setMoving(false), 1000);
    return () => clearTimeout(t);
  }, [mode]);

  const n = cards.length;
  const step = n > 1 ? (2 * geo.alpha) / (n - 1) : 0;
  const angleOf = (i: number) => (n > 1 ? -geo.alpha + i * step : 0);

  function stackOffset(i: number) {
    // 牌堆的厚度：越靠上的牌越往上偏一点
    const t = n > 1 ? i / (n - 1) : 0;
    return { x: t * 1.5, y: -t * 5 };
  }

  function transformOf(i: number) {
    if (mode === 'stack') {
      const o = stackOffset(i);
      return tf(o.x, o.y, 0, geo.R, geo.stackScale, 0);
    }
    if (mode === 'gather') return tf(0, geo.fh * 0.2, 0, geo.R, 0.9, 0);
    let lift = 0;
    if (hover != null) {
      const d = Math.abs(i - hover);
      lift = d === 0 ? geo.lift : d < 4 ? geo.lift * 0.28 * (1 - d / 4) : 0;
    }
    return tf(0, 0, (angleOf(i) * 180) / Math.PI, geo.R + lift, 1, 0);
  }

  function indexAt(clientX: number, clientY: number, strict: boolean): number | null {
    const el = ref.current;
    if (!el || !n) return null;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = rect.top + geo.pivotY - clientY;
    const ang = Math.atan2(dx, dy);
    const r = Math.hypot(dx, dy);
    if (strict) {
      if (r < geo.R - geo.fh * 0.55 || r > geo.R + geo.fh * 0.5 + geo.lift) return null;
      if (Math.abs(ang) > geo.alpha + step / 2 + 0.03) return null;
    } else if (clientY < rect.top - 70 || clientY > rect.bottom + 70) {
      return null;
    }
    if (n === 1) return 0;
    return clamp(Math.round((ang + geo.alpha) / step), 0, n - 1);
  }

  function pick(i: number) {
    const el = cardEls.current.get(cards[i].id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    onPick(i, { cx: r.left + r.width / 2, cy: r.top + r.height / 2, angle: (angleOf(i) * 180) / Math.PI, w: geo.fw });
    setHover(null);
  }

  const onDown = (e: RPointerEvent) => {
    if (mode === 'stack') return;
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setHover(indexAt(e.clientX, e.clientY, e.pointerType === 'mouse'));
  };
  const onMove = (e: RPointerEvent) => {
    if (!interactive || mode !== 'spread') return;
    if (dragging.current) setHover(indexAt(e.clientX, e.clientY, false));
    else if (e.pointerType === 'mouse') setHover(indexAt(e.clientX, e.clientY, true));
  };
  const onUp = (e: RPointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const i = indexAt(e.clientX, e.clientY, e.pointerType === 'mouse');
    if (i != null && interactive) pick(i);
    else setHover(null);
  };
  const onCancel = () => { dragging.current = false; setHover(null); };

  // 洗牌动画：顶上一叠牌左右分开、弯起、再交错合拢，重复两次
  useEffect(() => {
    if (!shuffleSignal) return;
    let done = false;
    const finish = () => { if (!done) { done = true; onShuffleEnd(); } };
    const fallback = setTimeout(finish, 2600); // 动画被打断时也保证流程继续
    if (prefersReducedMotion()) { finish(); return () => clearTimeout(fallback); }

    const K = Math.min(14, n);
    const anims: Animation[] = [];
    const spreadX = geo.fw * geo.stackScale * 0.6;
    for (let k = 0; k < K; k++) {
      const i = n - K + k;
      const el = cardEls.current.get(cards[i].id);
      if (!el) continue;
      const o = stackOffset(i);
      const side = k % 2 ? 1 : -1;
      const S = geo.stackScale, R = geo.R;
      anims.push(el.animate([
        { transform: tf(o.x, o.y, 0, R, S, 0), offset: 0 },
        { transform: tf(o.x + side * spreadX, o.y - 4 - k * 0.5, 0, R, S, side * 6), offset: 0.24 },
        { transform: tf(o.x + side * spreadX * 0.82, o.y - 9 - k * 0.7, 0, R, S, side * 2), offset: 0.44 },
        { transform: tf(o.x + side * 3, o.y - 2, 0, R, S, 0), offset: 0.64 },
        { transform: tf(o.x, o.y, 0, R, S, 0), offset: 0.78 },
        { transform: tf(o.x, o.y, 0, R, S, 0), offset: 1 },
      ], { duration: 760, iterations: 2, delay: k * 14, easing: 'cubic-bezier(.45,.05,.35,1)' }));
    }
    Promise.all(anims.map(a => a.finished)).catch(() => {}).then(finish);
    return () => { clearTimeout(fallback); anims.forEach(a => a.cancel()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleSignal]);

  return (
    <div
      ref={ref}
      className={`fan mode-${mode}` + (interactive && mode === 'spread' ? ' interactive' : '')}
      style={{ height: geo.height }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
      onPointerLeave={() => { if (!dragging.current) setHover(null); }}
      onClick={mode === 'stack' ? onStackClick : undefined}
    >
      {cards.map((c, i) => (
        <div
          key={c.id}
          ref={el => { if (el) cardEls.current.set(c.id, el); else cardEls.current.delete(c.id); }}
          className="fc"
          style={{
            width: geo.fw,
            height: geo.fh,
            left: `calc(50% - ${geo.fw / 2}px)`,
            top: geo.pivotY - geo.fh / 2,
            transform: transformOf(i),
            transition: moving
              ? `transform .7s cubic-bezier(.2,.8,.2,1) ${mode === 'spread' ? i * 5 : (n - i) * 2}ms, opacity .5s ease ${mode === 'gather' ? 150 : 0}ms`
              : 'transform .2s ease-out',
          }}
        >
          <img src={CARD_BACK} alt="" draggable={false} />
        </div>
      ))}
    </div>
  );
}

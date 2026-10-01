import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { CARD_BACK, CARD_RATIO } from '../data/cards';
import type { DrawnCard } from '../lib/random';
import { prefersReducedMotion } from '../lib/hooks';

/** 牌扇里的一张牌。uid 是这张"实体牌"的固定编号，洗牌只改变它对应哪张牌，不改变 DOM 顺序 */
export interface FanCard extends DrawnCard {
  uid: string;
}

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
  const fw0 = phone ? 60 : 88;
  const sRatio = phone ? 0.2 : 0.13;
  const geo = build(vw, fw0, sRatio, 125);
  const maxH = vh * (phone ? 0.36 : 0.4);
  if (geo.height <= maxH) return geo;
  const k = Math.max(0.55, maxH / geo.height);
  return build(vw, fw0 * k, sRatio * k, 125 * k);
}

// ---------- 鸽尾式洗牌的编排 ----------

interface Pose { x: number; y: number; r: number; s: number }
interface Frame { t: number; p: Pose; z: number; /** 进入这一帧的缓动 */ ease?: string }

/** 表演洗牌用的演员牌数量：足够看出两叠和交错，又不至于太重 */
const ACTORS = 16;

/** 第 k 张（0 为最底）在整齐牌堆里的位置，厚度和真实牌堆一致，演完换回时不跳 */
function restPose(k: number, K: number): Pose {
  const t = K > 1 ? k / (K - 1) : 0;
  return { x: t * 1.5, y: -t * 5, r: 0, s: 1 };
}

interface Round {
  /** 上半叠去哪一边（-1 左 / 1 右） */
  dir: 1 | -1;
  /** 下半叠的张数（分牌位置） */
  split: number;
  /** 两叠分开的距离、交错时两半的偏移、抬起高度（以牌宽为单位），倾角（度） */
  dx: number;
  mesh: number;
  lift: number;
  tilt: number;
  /** 各段时长（毫秒） */
  tSplit: number;
  tHold: number;
  tRiffle: number;
  tFall: number;
  tSquare: number;
  /** 压平时的瞬间缩放 */
  press: number;
  /** 先从哪一叠开始落牌 */
  first: 1 | -1;
}

// 两轮刻意不同：方向相反、分牌位置不同、第二轮更低更快、压得更实
const ROUNDS: Round[] = [
  { dir: -1, split: 8, dx: 0.64, mesh: 0.3, lift: 0.1, tilt: 7, tSplit: 240, tHold: 90, tRiffle: 380, tFall: 130, tSquare: 240, press: 0.985, first: 1 },
  { dir: 1, split: 7, dx: 0.55, mesh: 0.26, lift: 0.075, tilt: 5, tSplit: 210, tHold: 60, tRiffle: 330, tFall: 115, tSquare: 270, press: 0.972, first: -1 },
];

/** 生成每张演员牌的关键帧：分成两叠 → 抬起倾斜 → 交错落下 → 理齐压平，做两轮 */
function riffleTracks(K: number, w: number): { tracks: Frame[][]; total: number } {
  const tracks: Frame[][] = Array.from({ length: K }, (_, a) => [{ t: 0, p: restPose(a, K), z: a }]);
  let order = Array.from({ length: K }, (_, a) => a); // 自下而上
  let t = 0;
  ROUNDS.forEach((o, ri) => {
    const lower = order.slice(0, o.split), upper = order.slice(o.split);
    const side = new Map<number, 1 | -1>();
    const pos = new Map<number, number>();
    lower.forEach((a, j) => { side.set(a, (-o.dir) as 1 | -1); pos.set(a, j); });
    upper.forEach((a, j) => { side.set(a, o.dir); pos.set(a, j); });
    // 每叠的牌面朝中间倾斜，叠内逐张错开一点显出厚度
    const pilePose = (a: number, moreLift: number, moreTilt: number, s: number): Pose => {
      const sd = side.get(a)!, j = pos.get(a)!;
      return { x: sd * o.dx * w - sd * j * 0.3, y: -(o.lift + moreLift) * w - j * 0.55, r: -sd * (o.tilt + moreTilt), s };
    };
    const zPile = (a: number) => ri * 200 + (side.get(a) === o.dir ? 40 : 10) + pos.get(a)!;
    const tSplitEnd = t + o.tSplit, tHoldEnd = tSplitEnd + o.tHold;
    for (const a of order) {
      tracks[a].push({ t: tSplitEnd, p: pilePose(a, 0, 0, 1.03), z: zPile(a), ease: 'cubic-bezier(.4,0,.2,1)' });
      tracks[a].push({ t: tHoldEnd, p: pilePose(a, 0.03, 1.5, 1.04), z: zPile(a), ease: 'ease-in-out' });
    }
    // 两叠从底部轮流落牌，偶尔同一叠连落两张
    const left = (o.dir === -1 ? upper : lower).slice(), right = (o.dir === -1 ? lower : upper).slice();
    const seq: number[] = [];
    let cur = o.first;
    while (left.length || right.length) {
      const pile = cur === -1 ? left : right, other = cur === -1 ? right : left;
      seq.push((pile.length ? pile : other).shift()!);
      if (Math.random() < 0.8) cur = (cur === -1 ? 1 : -1);
    }
    // 落牌落在两叠内侧边缘相互重叠的区域：两半叠成交错的"半重叠"状态，后落的压在上面
    const gap = (o.tRiffle - o.tFall) / Math.max(1, K - 1);
    seq.forEach((a, k) => {
      const ts = tHoldEnd + k * gap, te = ts + o.tFall;
      const held = pilePose(a, 0.03, 1.5, 1.04);
      const z = ri * 200 + 100 + k;
      const sd = side.get(a)!;
      const rest = restPose(k, K);
      tracks[a].push({ t: ts, p: held, z: zPile(a) });
      tracks[a].push({ t: ts, p: held, z });
      tracks[a].push({
        t: te,
        p: { x: sd * o.mesh * w + rest.x + (Math.random() - 0.5) * 0.03 * w, y: rest.y - 1, r: -sd * 1.5 + (Math.random() - 0.5) * 1.5, s: 1.01 },
        z, ease: 'cubic-bezier(.55,0,.75,.6)',
      });
    });
    // 两半推合成一叠、理齐、压平，再回弹到原厚度
    const tRiffleEnd = tHoldEnd + o.tRiffle, tPress = tRiffleEnd + o.tSquare * 0.6, tEnd = tRiffleEnd + o.tSquare;
    seq.forEach((a, k) => {
      const rest = restPose(k, K), z = ri * 200 + 100 + k;
      tracks[a].push({ t: tPress, p: { ...rest, y: rest.y + 1, s: o.press }, z, ease: 'cubic-bezier(.3,.7,.3,1)' });
      tracks[a].push({ t: tEnd, p: rest, z, ease: 'cubic-bezier(.3,0,.3,1)' });
    });
    order = seq;
    t = tEnd;
  });
  // WAAPI 的 easing 写在一段的起点：把"进入下一帧的缓动"挪到前一帧上
  for (const tr of tracks) {
    for (let i = 0; i < tr.length; i++) tr[i].ease = tr[i + 1]?.ease ?? 'linear';
  }
  return { tracks, total: t };
}

export interface FlyFrom {
  cx: number;
  cy: number;
  angle: number;
  w: number;
}

/** stack 牌堆 → spread 展开 → gather 收成一叠 → fade 淡出 */
export type FanMode = 'stack' | 'spread' | 'gather' | 'fade';

interface Props {
  cards: FanCard[];
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

  function liftOf(i: number) {
    if (hover == null) return 0;
    const d = Math.abs(i - hover);
    return d === 0 ? geo.lift : d < 4 ? geo.lift * 0.28 * (1 - d / 4) : 0;
  }

  function transformOf(i: number) {
    if (mode === 'stack') {
      const o = stackOffset(i);
      return tf(o.x, o.y, 0, geo.R, geo.stackScale, 0);
    }
    if (mode === 'gather' || mode === 'fade') {
      // 收回到弧顶正中，叠成和洗牌时一样厚的一叠；淡出时再轻轻沉下去
      const o = stackOffset(i);
      return mode === 'gather' ? tf(o.x, o.y, 0, geo.R, 1, 0) : tf(o.x, o.y + 8, 0, geo.R, 0.96, 0);
    }
    return tf(0, 0, (angleOf(i) * 180) / Math.PI, geo.R + liftOf(i), 1, 0);
  }

  /** 各模式切换时的过渡：展开约 0.73 秒仍逐张错开；收牌两端先动、同时到位 */
  function transitionOf(i: number) {
    if (!moving) return 'transform .2s ease-out';
    if (mode === 'spread') return `transform .5s cubic-bezier(.2,.8,.2,1) ${i * 3}ms`;
    if (mode === 'gather') {
      const c = (n - 1) / 2;
      const delay = c > 0 ? Math.round((1 - Math.abs(i - c) / c) * 90) : 0;
      // 阴影随收拢一起淡掉，叠成一叠后不会出现一圈黑晕
      return `transform .5s cubic-bezier(.4,0,.2,1) ${delay}ms, box-shadow .45s ease ${delay}ms`;
    }
    if (mode === 'fade') return 'transform .32s ease-in, opacity .32s ease-in';
    return 'transform .2s ease-out';
  }

  /**
   * 指针下"看得见的"那张牌：从最上层往下，逐张把指针换算到牌自己的坐标系里判断。
   * 牌扇里每张牌只露出左边一窄条，不能按"离哪张牌中心最近"来算。
   * 抬起的牌按"原位置 + 抬起部分"一起算，避免抬起后指针落空、来回闪。
   */
  function indexAt(clientX: number, clientY: number, touch: boolean): number | null {
    const el = ref.current;
    if (!el || !n) return null;
    const rect = el.getBoundingClientRect();
    const px = clientX - (rect.left + rect.width / 2);
    const py = clientY - (rect.top + geo.pivotY);
    const hw = geo.fw / 2, hh = geo.fh / 2;
    for (let i = n - 1; i >= 0; i--) {
      const a = angleOf(i);
      const lx = px * Math.cos(a) + py * Math.sin(a);
      const ly = -px * Math.sin(a) + py * Math.cos(a) + geo.R;
      if (lx >= -hw && lx <= hw && ly >= -hh - liftOf(i) && ly <= hh) return i;
    }
    if (!touch) return null;
    // 手指滑出牌面：按角度估计，牌 i 露出的是它左边缘起的一条
    if (clientY < rect.top - 70 || clientY > rect.bottom + 70) return null;
    const ang = Math.atan2(px, -py);
    if (n === 1) return 0;
    return clamp(Math.floor((ang + Math.atan2(hw, geo.R) + geo.alpha) / step), 0, n - 1);
  }

  function pick(i: number) {
    const el = cardEls.current.get(cards[i].uid);
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
    setHover(indexAt(e.clientX, e.clientY, e.pointerType !== 'mouse'));
  };
  const onMove = (e: RPointerEvent) => {
    if (!interactive || mode !== 'spread') return;
    if (dragging.current || e.pointerType === 'mouse') setHover(indexAt(e.clientX, e.clientY, e.pointerType !== 'mouse'));
  };
  const onUp = (e: RPointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const i = indexAt(e.clientX, e.clientY, e.pointerType !== 'mouse');
    if (i != null && interactive) pick(i);
    else setHover(null);
  };
  const onCancel = () => { dragging.current = false; setHover(null); };

  // ---------- 洗牌（鸽尾式）：用一组临时的"演员牌"表演，真实牌堆先藏起来，演完无缝换回 ----------
  const [shuffling, setShuffling] = useState(0);
  const actorEls = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!shuffleSignal) return;
    if (prefersReducedMotion()) { onShuffleEnd(); return; }
    setShuffling(shuffleSignal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleSignal]);

  useLayoutEffect(() => {
    if (!shuffling) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setShuffling(0);
      onShuffleEnd();
    };
    const { tracks, total } = riffleTracks(ACTORS, geo.fw * geo.stackScale);
    const anims: Animation[] = [];
    actorEls.current.forEach((el, a) => {
      if (!el) return;
      anims.push(el.animate(tracks[a].map(f => ({
        offset: f.t / total,
        transform: actorTf(f.p),
        zIndex: String(f.z),
        easing: f.ease ?? 'cubic-bezier(.3,.6,.3,1)',
      })), { duration: total, fill: 'forwards' }));
    });
    const fallback = setTimeout(finish, total + 800); // 动画被打断也要让流程继续
    Promise.all(anims.map(x => x.finished)).catch(() => {}).then(finish);
    return () => { clearTimeout(fallback); anims.forEach(x => x.cancel()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffling]);

  // 演员牌的姿态：先平移到牌堆位置（屏幕像素），再绕牌心旋转、缩放
  const actorTf = (p: Pose) => `${tf(p.x, p.y, 0, geo.R, geo.stackScale, p.r)} scale(${p.s})`;

  return (
    <div
      ref={ref}
      className={`fan mode-${mode}` + (interactive && mode === 'spread' ? ' interactive' : '') + (shuffling ? ' shuffling' : '')}
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
          key={c.uid}
          ref={el => { if (el) cardEls.current.set(c.uid, el); else cardEls.current.delete(c.uid); }}
          className="fc"
          style={{
            width: geo.fw,
            height: geo.fh,
            left: `calc(50% - ${geo.fw / 2}px)`,
            top: geo.pivotY - geo.fh / 2,
            transform: transformOf(i),
            transition: transitionOf(i),
          }}
        >
          <img src={CARD_BACK} alt="" draggable={false} />
        </div>
      ))}
      {shuffling > 0 && Array.from({ length: ACTORS }, (_, a) => (
        <div
          key={`${shuffling}-${a}`}
          ref={el => { actorEls.current[a] = el; }}
          className="fc actor"
          style={{
            width: geo.fw,
            height: geo.fh,
            left: `calc(50% - ${geo.fw / 2}px)`,
            top: geo.pivotY - geo.fh / 2,
            transform: actorTf(restPose(a, ACTORS)),
            zIndex: a,
          }}
        >
          <img src={CARD_BACK} alt="" draggable={false} />
        </div>
      ))}
    </div>
  );
}

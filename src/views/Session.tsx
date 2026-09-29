import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CARD_BACK, CARD_IDS, CARD_RATIO } from '../data/cards';
import { SPREADS, type SpreadId } from '../data/spreads';
import { Board, LABEL_H } from '../components/Board';
import { Fan, fanGeometry, type FanCard, type FanMode, type FlyFrom } from '../components/Fan';
import { ReadingBody } from '../components/ReadingBody';
import { useViewport } from '../lib/hooks';
import { go } from '../lib/router';
import { shuffleDeck, type DrawnCard } from '../lib/random';
import { newId, saveReading, todayKey, type Reading } from '../lib/store';

type Phase = 'ready' | 'shuffling' | 'spread' | 'gather' | 'reveal';

const TOPBAR = 56;

interface Flyer { key: number; slot: number; from: FlyFrom }

export function Session({ spreadId, question }: { spreadId: SpreadId; question: string }) {
  const spread = SPREADS[spreadId];
  const total = spread.positions.length;
  const vp = useViewport();
  const geo = useMemo(() => fanGeometry(vp.w, vp.h - vp.sat - vp.sab), [vp.w, vp.h, vp.sat, vp.sab]);

  const [deck, setDeck] = useState<FanCard[]>(() => shuffleDeck(CARD_IDS).map((c, i) => ({ ...c, uid: `u${i}` })));
  const [phase, setPhase] = useState<Phase>('ready');
  const [shuffleSignal, setShuffleSignal] = useState(0);
  const [drawn, setDrawn] = useState<(DrawnCard | null)[]>(() => Array(total).fill(null));
  const [landed, setLanded] = useState<boolean[]>(() => Array(total).fill(false));
  const [flipped, setFlipped] = useState<boolean[]>(() => Array(total).fill(false));
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [fanGone, setFanGone] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flyKey = useRef(0);

  const allLanded = landed.every(Boolean);
  const allFlipped = flipped.every(Boolean);
  const revealing = phase === 'gather' || phase === 'reveal';

  // ---------- 布局：抽牌页只有牌阵和牌扇，牌阵占满剩下的高度 ----------
  const labelH = spread.labels === 'name' ? LABEL_H : 0;
  const availW = Math.min(vp.w - 32, 980);
  // vp.h 是整个窗口高度；在安卓 App 里它包含状态栏和底部导航条，要扣掉
  const usableH = vp.h - vp.sat - vp.sab;
  const drawAreaH = Math.max(160, usableH - TOPBAR - geo.height - 8);
  const revealAreaH = spreadId === 'celtic' ? usableH - TOPBAR - 24 : Math.min(usableH * 0.62, 600);
  const areaH = revealing ? revealAreaH : drawAreaH;
  const cw = Math.floor(Math.min(availW / spread.w, (areaH - labelH - 28) / spread.h, spread.maxCw));
  const boardH = spread.h * cw + labelH;

  // ---------- 洗牌 ----------
  function startShuffle() {
    if (phase !== 'ready') return;
    setPhase('shuffling');
    setShuffleSignal(s => s + 1);
  }
  function onShuffleEnd() {
    // 重新随机每张实体牌对应的牌，但保持 DOM 顺序不变，展开动画才连贯
    setDeck(d => {
      const fresh = shuffleDeck(d.map(c => c.id));
      return d.map((c, i) => ({ ...fresh[i], uid: c.uid }));
    });
    setPhase('spread');
  }

  // ---------- 抽牌 ----------
  function onPick(index: number, from: FlyFrom) {
    const slot = drawn.findIndex(d => d === null);
    if (slot < 0) return;
    const { id, reversed } = deck[index];
    const card: DrawnCard = { id, reversed };
    setDeck(d => d.filter((_, i) => i !== index));
    setDrawn(d => d.map((x, i) => (i === slot ? card : x)));
    setFlyers(f => [...f, { key: ++flyKey.current, slot, from }]);
  }
  function onLanded(f: Flyer) {
    setLanded(l => l.map((x, i) => (i === f.slot ? true : x)));
    setFlyers(list => list.filter(x => x.key !== f.key));
  }

  // 全部落位后：牌扇收起，牌阵放大，进入翻牌
  useEffect(() => {
    if (!allLanded || phase !== 'spread') return;
    const t1 = setTimeout(() => setPhase('gather'), 250);
    return () => clearTimeout(t1);
  }, [allLanded, phase]);
  useEffect(() => {
    if (phase !== 'gather') return;
    const t = setTimeout(() => { setFanGone(true); setPhase('reveal'); }, 650);
    return () => clearTimeout(t);
  }, [phase]);

  // ---------- 翻牌 ----------
  function onCardClick(i: number) {
    // 凯尔特十字第 2 张横压在第 1 张上，点十字中心时按顺序先翻第 1 张
    if (spread.positions[i].cross && i > 0 && !flipped[i - 1]) i = i - 1;
    if (phase !== 'reveal' || flipped[i]) return;
    setFlipped(f => f.map((x, j) => (j === i ? true : x)));
  }

  // 全部翻开：保存这次占卜，地址换成记录页（刷新后仍能看到）
  useEffect(() => {
    if (!allFlipped || reading) return;
    const r: Reading = {
      id: newId(),
      time: Date.now(),
      question,
      spread: spreadId,
      cards: drawn as DrawnCard[],
      followups: [],
      ...(spreadId === 'daily' ? { day: todayKey() } : {}),
    };
    saveReading(r);
    setReading(r);
    history.replaceState(history.state, '', `#/r/${r.id}`);
  }, [allFlipped, reading, question, spreadId, drawn]);

  const fanMode: FanMode = phase === 'spread' ? 'spread' : phase === 'gather' ? 'gather' : 'stack';
  const nextSlot = phase === 'spread' ? drawn.findIndex(d => d === null) : -1;

  return (
    <div className={'session' + (revealing ? ' revealing' : '')}>
      <div className="board-area" style={{ height: revealing ? boardH + 24 : areaH }}>
        <Board
          spread={spread}
          cards={drawn}
          landed={landed}
          flipped={flipped}
          cw={cw}
          next={nextSlot >= 0 ? nextSlot : undefined}
          slotRefs={slotRefs}
          onCardClick={phase === 'reveal' ? onCardClick : undefined}
        />
      </div>

      {!fanGone && (
        <div className="fan-wrap" style={{ height: revealing ? 0 : geo.height }}>
          <Fan
            cards={deck}
            geo={geo}
            mode={fanMode}
            interactive={phase === 'spread' && nextSlot >= 0}
            onPick={onPick}
            onStackClick={startShuffle}
            shuffleSignal={shuffleSignal}
            onShuffleEnd={onShuffleEnd}
          />
        </div>
      )}

      {phase === 'reveal' && (
        <ReadingBody
          spreadId={spreadId}
          cards={drawn as DrawnCard[]}
          flipped={flipped}
          reading={reading}
          live
          footer={
            <div className="reading-foot">
              <button className="btn" onClick={() => go('')}>再占一次</button>
            </div>
          }
        />
      )}

      {flyers.map(f => (
        <FlyingCard key={f.key} flyer={f} cw={cw} slotEl={slotRefs.current[f.slot]} cross={!!spread.positions[f.slot].cross} onDone={() => onLanded(f)} />
      ))}
    </div>
  );
}

function FlyingCard({ flyer, cw, slotEl, cross, onDone }: { flyer: Flyer; cw: number; slotEl: HTMLDivElement | null; cross: boolean; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useLayoutEffect(() => {
    if (!slotEl) { doneRef.current(); return; }
    const r = slotEl.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    setBox({ left: cx - cw / 2, top: cy - (cw * CARD_RATIO) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!box || !ref.current) return;
    const cx = box.left + cw / 2, cy = box.top + (cw * CARD_RATIO) / 2;
    const { from } = flyer;
    const s0 = from.w / cw;
    const end = `translate(0px, 0px) rotate(${cross ? 90 : 0}deg) scale(1)`;
    const anim = ref.current.animate([
      { transform: `translate(${from.cx - cx}px, ${from.cy - cy}px) rotate(${from.angle}deg) scale(${s0})` },
      { transform: `translate(${(from.cx - cx) * 0.35}px, ${(from.cy - cy) * 0.35 - 30}px) rotate(${(cross ? 90 : 0) * 0.6 + from.angle * 0.2}deg) scale(${0.3 * s0 + 0.75})`, offset: 0.55 },
      { transform: end },
    ], { duration: 640, easing: 'cubic-bezier(.3,.7,.25,1)', fill: 'forwards' });
    const t = setTimeout(() => doneRef.current(), 900); // 兜底：动画没有正常结束也要落位
    anim.finished.catch(() => {}).then(() => { clearTimeout(t); doneRef.current(); });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);

  if (!box) return null;
  return (
    <div ref={ref} className="flyer" style={{ left: box.left, top: box.top, width: cw, height: cw * CARD_RATIO }}>
      <img src={CARD_BACK} alt="" draggable={false} />
    </div>
  );
}

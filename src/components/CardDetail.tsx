import { useEffect, useRef, useState } from 'react';
import { CARD_MAP, SUIT_NAMES, cardImage } from '../data/cards';
import type { CardTarget } from '../ui';
import { useBackClose } from '../lib/hooks';
import { IconChevron, IconClose } from './Icons';

export function CardDetail({ target, onClose }: { target: CardTarget | null; onClose: () => void }) {
  const [shown, setShown] = useState<CardTarget | null>(target);
  const [id, setId] = useState(target?.id);
  const close = useBackClose(!!target, onClose);
  const touch = useRef<{ x: number; y: number } | null>(null);

  // 关闭时保留内容做淡出
  useEffect(() => {
    if (target) { setShown(target); setId(target.id); }
  }, [target]);

  const list = shown?.list;
  const idx = list && id ? list.indexOf(id) : -1;
  const nav = (d: number) => {
    if (!list || idx < 0) return;
    setId(list[(idx + d + list.length) % list.length]);
  };

  useEffect(() => {
    if (!target) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') nav(-1);
      else if (e.key === 'ArrowRight') nav(1);
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  });

  const card = id ? CARD_MAP[id] : undefined;
  if (!shown || !card) return null;

  const inReading = shown.reversed !== undefined && id === shown.id;
  const rev = inReading && shown.reversed;
  const sections = [
    { key: 'up', label: '正位', m: card.up, current: inReading && !rev },
    { key: 'rev', label: '逆位', m: card.rev, current: inReading && rev },
  ];
  if (rev) sections.reverse();

  return (
    <div
      className={'overlay detail' + (target ? ' open' : '')}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={e => {
        const t = touch.current;
        touch.current = null;
        if (!t || !list) return;
        const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) nav(dx < 0 ? 1 : -1);
      }}
    >
      <button className="icon-btn overlay-close" onClick={close} aria-label="关闭"><IconClose /></button>
      {list && (
        <>
          <button className="icon-btn detail-nav prev" onClick={() => nav(-1)} aria-label="上一张"><IconChevron dir="left" /></button>
          <button className="icon-btn detail-nav next" onClick={() => nav(1)} aria-label="下一张"><IconChevron /></button>
        </>
      )}
      <div className="detail-body" key={id} onClick={e => { if (e.target === e.currentTarget) close(); }}>
        <div className="detail-img">
          <img src={cardImage(card.id)} alt={card.name} className={rev ? 'rev' : undefined} draggable={false} />
        </div>
        <div className="detail-text">
          {inReading && shown.position && (
            <div className="detail-pos">{shown.position.name} · {shown.position.desc}</div>
          )}
          <h2>{card.name}</h2>
          <div className="detail-en">
            {card.en}<span>{card.suit === 'major' ? SUIT_NAMES.major : `小阿尔卡那 · ${SUIT_NAMES[card.suit]}`}</span>
          </div>
          {sections.map(s => (
            <section key={s.key} className={'detail-sec' + (inReading && !s.current ? ' dim' : '')}>
              <h4>{s.label}{s.current && <em>本次</em>}</h4>
              <div className="keys">{s.m.k.join(' · ')}</div>
              <p>{s.m.m}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

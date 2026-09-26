import type { MutableRefObject } from 'react';
import { CARD_RATIO } from '../data/cards';
import type { Spread } from '../data/spreads';
import type { DrawnCard } from '../lib/random';
import { TarotCard } from './TarotCard';

export const LABEL_H = 30;

interface Props {
  spread: Spread;
  cards: (DrawnCard | null)[];
  landed: boolean[];
  flipped: boolean[];
  cw: number;
  /** 下一张要落到哪个位置（抽牌时高亮） */
  next?: number;
  slotRefs?: MutableRefObject<(HTMLDivElement | null)[]>;
  onCardClick?: (i: number) => void;
  instant?: boolean;
}

export function Board({ spread, cards, landed, flipped, cw, next, slotRefs, onCardClick, instant }: Props) {
  const ch = cw * CARD_RATIO;
  const labelH = spread.labels === 'name' ? LABEL_H : 0;
  return (
    <div className="board" style={{ width: spread.w * cw, height: spread.h * cw + labelH }}>
      {spread.positions.map((p, i) => {
        const card = cards[i];
        const isLanded = landed[i] && card;
        return (
          <div
            key={i}
            ref={el => { if (slotRefs) slotRefs.current[i] = el; }}
            className={'slot' + (p.cross ? ' cross' : '') + (next === i ? ' next' : '')}
            style={{ left: p.x * cw - cw / 2, top: p.y * cw - ch / 2, width: cw, height: ch }}
          >
            {!isLanded && (
              <div className="slot-empty">
                {spread.labels === 'number' && <span>{i + 1}</span>}
              </div>
            )}
            {isLanded && (
              <TarotCard
                id={card.id}
                reversed={card.reversed}
                faceUp={flipped[i]}
                width={cw}
                instant={instant}
                onClick={onCardClick ? () => onCardClick(i) : undefined}
              />
            )}
            {spread.labels === 'name' && <div className="slot-label">{p.name}</div>}
          </div>
        );
      })}
    </div>
  );
}

import type { ReactNode } from 'react';
import { CARD_MAP, cardImage } from '../data/cards';
import { SPREADS, type SpreadId } from '../data/spreads';
import type { DrawnCard } from '../lib/random';
import type { Reading } from '../lib/store';
import { useUI } from '../ui';
import { AiSection } from './AiSection';

interface Props {
  spreadId: SpreadId;
  cards: DrawnCard[];
  flipped: boolean[];
  reading: Reading | null;
  /** 现场占卜：全部翻开后自动开始 AI 解读 */
  live?: boolean;
  footer?: ReactNode;
}

export function ReadingBody({ spreadId, cards, flipped, reading, live, footer }: Props) {
  const spread = SPREADS[spreadId];
  const { openCard } = useUI();
  const shown = spread.positions.map((_, i) => i).filter(i => flipped[i]);
  const complete = flipped.every(Boolean);

  return (
    <div className="reading">
      <div className="entries">
        {shown.map(i => {
          const c = cards[i];
          const card = CARD_MAP[c.id];
          const pos = spread.positions[i];
          const m = c.reversed ? card.rev : card.up;
          const open = () => openCard({ id: c.id, reversed: c.reversed, position: pos });
          return (
            <article className="entry" key={i}>
              <button className="entry-thumb" onClick={open} aria-label={`查看${card.name}`}>
                <img src={cardImage(c.id, 'sm')} alt="" className={c.reversed ? 'rev' : undefined} draggable={false} />
              </button>
              <div className="entry-text">
                <div className="entry-pos">
                  {spread.labels === 'number' && <span className="num">{i + 1}</span>}
                  {pos.name}
                </div>
                <h3 className="entry-name" onClick={open}>
                  {card.name}
                  <span className={'orient' + (c.reversed ? ' rev' : '')}>{c.reversed ? '逆位' : '正位'}</span>
                </h3>
                <div className="keys">{m.k.join(' · ')}</div>
                <p className="entry-m">{m.m}</p>
              </div>
            </article>
          );
        })}
      </div>

      {complete && reading && <AiSection key={reading.id} reading={reading} live={live} />}
      {complete && footer}
    </div>
  );
}

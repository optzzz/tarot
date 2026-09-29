import { useMemo, useState } from 'react';
import { SPREADS } from '../data/spreads';
import { Board, LABEL_H } from '../components/Board';
import { ReadingBody } from '../components/ReadingBody';
import { useViewport } from '../lib/hooks';
import { back } from '../lib/router';
import { deleteReading, useHistory } from '../lib/store';
import { useUI } from '../ui';
import { formatTime } from './HistoryPage';

export function ReadingPage({ id }: { id: string }) {
  const list = useHistory();
  const reading = useMemo(() => list.find(r => r.id === id), [list, id]);
  const vp = useViewport();
  const { openCard } = useUI();
  const [confirming, setConfirming] = useState(false);

  if (!reading) {
    return <main className="page empty-page"><p className="muted">这条记录不存在，可能已被删除。</p></main>;
  }

  const spread = SPREADS[reading.spread];
  const labelH = spread.labels === 'name' ? LABEL_H : 0;
  const availW = Math.min(vp.w - 32, 980);
  const usableH = vp.h - vp.sat - vp.sab;
  const availH = reading.spread === 'celtic' ? usableH - 56 - 120 : Math.min(usableH * 0.62, 600);
  const cw = Math.floor(Math.min(availW / spread.w, (availH - labelH - 20) / spread.h, spread.maxCw));
  const all = reading.cards.map(() => true);

  function remove() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    deleteReading(reading!.id);
    back();
  }

  return (
    <main className="session revealing">
      <div className="session-q">
        {reading.question && <p>{reading.question}</p>}
        <div className="session-meta">{formatTime(reading.time)} · {spread.name}</div>
      </div>
      <div className="board-area" style={{ height: spread.h * cw + labelH + 24 }}>
        <Board
          spread={spread}
          cards={reading.cards}
          landed={all}
          flipped={all}
          cw={cw}
          instant
          onCardClick={i => openCard({ id: reading.cards[i].id, reversed: reading.cards[i].reversed, position: spread.positions[i] })}
        />
      </div>
      <ReadingBody
        spreadId={reading.spread}
        cards={reading.cards}
        flipped={all}
        reading={reading}
        footer={
          <div className="reading-foot">
            <button className={'text-btn danger' + (confirming ? ' confirm' : '')} onClick={remove}>
              {confirming ? '再点一次确认删除' : '删除这条记录'}
            </button>
          </div>
        }
      />
    </main>
  );
}

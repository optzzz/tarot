import { CARD_MAP, cardImage } from '../data/cards';
import { SPREADS } from '../data/spreads';
import { go } from '../lib/router';
import { useHistory } from '../lib/store';

export function formatTime(t: number): string {
  const d = new Date(t);
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) return `今天 ${hm}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return `昨天 ${hm}`;
  const md = `${d.getMonth() + 1}月${d.getDate()}日`;
  return d.getFullYear() === now.getFullYear() ? `${md} ${hm}` : `${d.getFullYear()}年${md}`;
}

export function HistoryPage() {
  const list = useHistory();

  if (!list.length) {
    return <main className="page empty-page"><p className="muted">还没有占卜记录</p></main>;
  }

  return (
    <main className="page history">
      <ul className="history-list">
        {list.map(r => {
          const spread = SPREADS[r.spread];
          const title = r.question || (r.spread === 'daily' ? '今日一牌' : r.cards.map(c => CARD_MAP[c.id].name).join(' · '));
          const thumbs = r.cards.slice(0, 3);
          return (
            <li key={r.id}>
              <button className="history-item" onClick={() => go(`r/${r.id}`)}>
                <div className="thumbs" style={{ width: 30 + (thumbs.length - 1) * 12 }}>
                  {thumbs.map((c, i) => (
                    <img
                      key={i}
                      src={cardImage(c.id, 'sm')}
                      alt=""
                      className={c.reversed ? 'rev' : undefined}
                      style={{ left: i * 12, zIndex: i }}
                      draggable={false}
                    />
                  ))}
                </div>
                <div className="history-text">
                  <div className="history-title">{title}</div>
                  <div className="history-meta">
                    {formatTime(r.time)} · {spread.name}
                    {r.question && r.spread !== 'daily' && <> · {r.cards.map(c => CARD_MAP[c.id].name).slice(0, 3).join('、')}{r.cards.length > 3 ? '…' : ''}</>}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

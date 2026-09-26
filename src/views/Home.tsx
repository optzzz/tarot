import { useRef, useState, type KeyboardEvent } from 'react';
import { CARD_MAP } from '../data/cards';
import { SPREADS, SPREAD_CHOICES, type SpreadId } from '../data/spreads';
import { IconSpark } from '../components/Icons';
import { go } from '../lib/router';
import { findDaily, prefs, useHistory } from '../lib/store';

export const PENDING_KEY = 'tarot.pending';

export function Home() {
  const [question, setQuestion] = useState('');
  const [spread, setSpread] = useState<SpreadId>(() => prefs.lastSpread);
  const ta = useRef<HTMLTextAreaElement>(null);
  useHistory(); // 记录变化时刷新"今日一牌"的状态
  const daily = findDaily();

  function start() {
    prefs.lastSpread = spread;
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ question: question.trim(), spread })); } catch { /* 忽略 */ }
    go('draw');
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); start(); }
  }

  function autosize() {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  const dailyCard = daily ? CARD_MAP[daily.cards[0].id] : null;

  return (
    <main className="home">
      <div className="home-inner">
        <textarea
          ref={ta}
          className="question"
          rows={1}
          value={question}
          onChange={e => { setQuestion(e.target.value); autosize(); }}
          onKeyDown={onKey}
          placeholder="你想问什么？也可以只在心里默念"
          maxLength={300}
        />

        <div className="spread-pick" role="radiogroup" aria-label="牌阵">
          {SPREAD_CHOICES.map(id => (
            <button
              key={id}
              role="radio"
              aria-checked={spread === id}
              className={spread === id ? 'on' : undefined}
              onClick={() => setSpread(id)}
            >
              {SPREADS[id].name}
            </button>
          ))}
        </div>
        <div className="spread-hint">{SPREADS[spread].hint}</div>

        <button className="btn primary start" onClick={start}>开始</button>

        <button
          className="daily-link"
          onClick={() => (daily ? go(`r/${daily.id}`) : go('daily'))}
        >
          <IconSpark width={13} height={13} />
          今日一牌
          {dailyCard && <span> · {dailyCard.name}{daily!.cards[0].reversed ? '（逆位）' : ''}</span>}
        </button>
      </div>
    </main>
  );
}

import { useState } from 'react';
import { CARDS, SUIT_NAMES, cardImage, type Suit } from '../data/cards';
import { useUI } from '../ui';

const FILTERS: (Suit | 'all')[] = ['all', 'major', 'wands', 'cups', 'swords', 'pentacles'];

export function DeckPage() {
  const [filter, setFilter] = useState<Suit | 'all'>('all');
  const { openCard } = useUI();
  const cards = filter === 'all' ? CARDS : CARDS.filter(c => c.suit === filter);
  const ids = cards.map(c => c.id);

  return (
    <main className="page deck">
      <div className="chips" role="tablist">
        {FILTERS.map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={filter === f ? 'on' : undefined}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '全部' : SUIT_NAMES[f]}
          </button>
        ))}
      </div>
      <div className="grid">
        {cards.map(c => (
          <button key={c.id} className="grid-card" onClick={() => openCard({ id: c.id, list: ids })}>
            <img src={cardImage(c.id, 'sm')} alt="" loading="lazy" draggable={false} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

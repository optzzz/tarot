import { useEffect, useMemo, useState } from 'react';
import { CloudBackground } from './components/CloudBackground';
import { TopBar } from './components/TopBar';
import { CardDetail } from './components/CardDetail';
import { SettingsDialog } from './components/SettingsDialog';
import { Home, PENDING_KEY } from './views/Home';
import { Session } from './views/Session';
import { ReadingPage } from './views/ReadingPage';
import { HistoryPage } from './views/HistoryPage';
import { DeckPage } from './views/DeckPage';
import { go, useRoute } from './lib/router';
import { findDaily, prefs } from './lib/store';
import type { SpreadId } from './data/spreads';
import { UIContext, type CardTarget } from './ui';

function readPending(): { question: string; spread: SpreadId } {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? '');
    if (p && typeof p.question === 'string' && p.spread) return p;
  } catch { /* 忽略 */ }
  return { question: '', spread: prefs.lastSpread };
}

function DailyGate() {
  const existing = findDaily();
  useEffect(() => {
    if (existing) go(`r/${existing.id}`, true);
  }, [existing]);
  return existing ? null : <Session spreadId="daily" question="" />;
}

export function App() {
  const route = useRoute();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [card, setCard] = useState<CardTarget | null>(null);
  const ui = useMemo(() => ({ openSettings: () => setSettingsOpen(true), openCard: setCard }), []);

  useEffect(() => { window.scrollTo(0, 0); }, [route]);

  let view;
  switch (route.name) {
    case 'draw': {
      const p = readPending();
      view = <Session spreadId={p.spread} question={p.question} />;
      break;
    }
    case 'daily': view = <DailyGate />; break;
    case 'reading': view = <ReadingPage id={route.id} />; break;
    case 'history': view = <HistoryPage />; break;
    case 'deck': view = <DeckPage />; break;
    default: view = <Home />;
  }

  return (
    <UIContext.Provider value={ui}>
      <CloudBackground />
      <TopBar route={route} />
      <div className="view" key={route.name + ('id' in route ? route.id : '')}>{view}</div>
      <CardDetail target={card} onClose={() => setCard(null)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </UIContext.Provider>
  );
}

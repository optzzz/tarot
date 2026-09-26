import { useEffect, useState } from 'react';
import { IconBack, IconDeck, IconHistory, IconSettings } from './Icons';
import { back, go, type Route } from '../lib/router';
import { useUI } from '../ui';

export function TopBar({ route }: { route: Route }) {
  const { openSettings } = useUI();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, [route]);

  const isHome = route.name === 'home';

  return (
    <header className={'topbar' + (scrolled ? ' scrolled' : '')}>
      <div className="topbar-side">
        {!isHome && (
          <button className="icon-btn" onClick={back} aria-label="返回" title="返回">
            <IconBack />
          </button>
        )}
      </div>
      <div className="topbar-side">
        <button
          className={'icon-btn' + (route.name === 'history' ? ' active' : '')}
          onClick={() => route.name !== 'history' && go('history')}
          aria-label="占卜记录" title="占卜记录"
        >
          <IconHistory />
        </button>
        <button
          className={'icon-btn' + (route.name === 'deck' ? ' active' : '')}
          onClick={() => route.name !== 'deck' && go('deck')}
          aria-label="牌义图鉴" title="牌义图鉴"
        >
          <IconDeck />
        </button>
        <button className="icon-btn" onClick={openSettings} aria-label="AI 设置" title="AI 设置">
          <IconSettings />
        </button>
      </div>
    </header>
  );
}

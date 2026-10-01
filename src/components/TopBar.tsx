import { useEffect, useState } from 'react';
import { IconBack, IconCards } from './Icons';
import { back, go, type HubTab, type Route } from '../lib/router';
import { prefs } from '../lib/store';

const TABS: { id: HubTab; name: string }[] = [
  { id: 'history', name: '记录' },
  { id: 'deck', name: '图鉴' },
  { id: 'settings', name: '设置' },
];

/**
 * 顶栏：左边返回；右边平时只有一个入口（三张扇开的牌），
 * 点开进入"记录 / 图鉴 / 设置"，在这几页里右上角换成三者之间的切换。
 */
export function TopBar({ route }: { route: Route }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, [route]);

  const isHome = route.name === 'home';
  const tab = TABS.find(t => t.id === route.name)?.id;

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
        {tab ? (
          <nav className="hub-tabs" aria-label="记录、图鉴与设置">
            {TABS.map(t => (
              <button
                key={t.id}
                className={t.id === tab ? 'on' : undefined}
                aria-current={t.id === tab ? 'page' : undefined}
                onClick={() => {
                  if (t.id === tab) return;
                  prefs.lastTab = t.id;
                  go(t.id, true); // 切换不进历史，返回键直接回到进来之前的页面
                }}
              >
                {t.name}
              </button>
            ))}
          </nav>
        ) : (
          <button className="icon-btn hub-btn" onClick={() => go(prefs.lastTab)} aria-label="记录、图鉴与设置" title="记录 · 图鉴 · 设置">
            <IconCards width={22} height={22} />
          </button>
        )}
      </div>
    </header>
  );
}

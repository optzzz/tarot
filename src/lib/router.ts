import { useEffect, useState } from 'react';

/** 右上角入口里的三页 */
export type HubTab = 'history' | 'deck' | 'settings';

export type Route =
  | { name: 'home' }
  | { name: 'draw' }
  | { name: 'daily' }
  | { name: 'reading'; id: string }
  | { name: 'history' }
  | { name: 'deck' }
  | { name: 'settings' };

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const [head, arg] = path.split('/');
  switch (head) {
    case 'draw': return { name: 'draw' };
    case 'daily': return { name: 'daily' };
    case 'r': return arg ? { name: 'reading', id: arg } : { name: 'home' };
    case 'history': return { name: 'history' };
    case 'deck': return { name: 'deck' };
    case 'settings': return { name: 'settings' };
    default: return { name: 'home' };
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(location.hash));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path: string, replace = false) {
  const hash = '#/' + path.replace(/^\//, '');
  if (replace) {
    history.replaceState(history.state, '', hash);
    dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
}

/** 返回上一页；如果是直接打开的深链接，没有上一页，就回首页 */
export function back() {
  if (history.state?.inApp) history.back();
  else go('', true);
}

// 标记应用内产生的历史记录，用来判断"返回"是否还在应用里
addEventListener('hashchange', () => {
  if (!history.state?.inApp) history.replaceState({ ...(history.state ?? {}), inApp: true }, '');
});

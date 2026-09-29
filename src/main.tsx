import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// 安卓 App 外壳让网页铺到状态栏和导航条下面，并把这两块的高度（CSS px）告诉网页：
// 首次通过地址参数 ?sat=&sab=，之后（旋转屏幕、弹出键盘）调用 window.__setSafeArea。
// 浏览器里没有这些参数，继续用 CSS 的 env(safe-area-inset-*)。
function setSafeArea(top: number, bottom: number) {
  const s = document.documentElement.style;
  s.setProperty('--sat', `${top}px`);
  s.setProperty('--sab', `${bottom}px`);
  dispatchEvent(new Event('safearea'));
}
(window as unknown as { __setSafeArea: typeof setSafeArea }).__setSafeArea = setSafeArea;
const params = new URLSearchParams(location.search);
if (params.has('sat')) setSafeArea(Number(params.get('sat')) || 0, Number(params.get('sab')) || 0);

createRoot(document.getElementById('root')!).render(<App />);

// 离线缓存：只在正式构建里启用，开发时不干扰热更新
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

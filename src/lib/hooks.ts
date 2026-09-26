import { useEffect, useRef, useState } from 'react';

export function useViewport() {
  const get = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [vp, setVp] = useState(get);
  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setVp(get())); };
    addEventListener('resize', on);
    return () => { removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return vp;
}

/**
 * 浮层打开时压一条历史记录，这样手机的返回手势/返回键会关闭浮层，而不是离开页面。
 * 返回的函数用于界面上的关闭按钮。
 */
export function useBackClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const pushed = useRef(false);
  useEffect(() => {
    if (!open) return;
    history.pushState({ ...(history.state ?? {}), overlay: true }, '');
    pushed.current = true;
    const onPop = () => { pushed.current = false; closeRef.current(); };
    addEventListener('popstate', onPop);
    return () => {
      removeEventListener('popstate', onPop);
      // 被其他方式关闭（例如路由切换）时，把压入的那条记录退掉
      if (pushed.current) { pushed.current = false; history.back(); }
    };
  }, [open]);
  return () => {
    if (pushed.current) history.back();
    else closeRef.current();
  };
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

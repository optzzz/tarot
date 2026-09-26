import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/hooks';

// 云层背景：低分辨率画布拉满全屏，靠浏览器插值 + blur 柔化；色块极慢漂移（单个循环 100–300 秒）
const W = 200, H = 120;
const BG = '#0b0d18';

interface Blob { x: number; y: number; r: number; ax: number; ay: number; fx: number; fy: number; p: number; col: string }

const BLOBS: Blob[] = [
  { x: 45, y: 28, r: 72, ax: 26, ay: 14, fx: 0.0061, fy: 0.0047, p: 0.0, col: 'rgba(62,70,150,0.30)' },
  { x: 160, y: 36, r: 80, ax: 22, ay: 18, fx: 0.0043, fy: 0.0068, p: 1.7, col: 'rgba(92,64,138,0.24)' },
  { x: 110, y: 96, r: 88, ax: 30, ay: 12, fx: 0.0052, fy: 0.0035, p: 3.1, col: 'rgba(34,86,116,0.20)' },
  { x: 18, y: 104, r: 62, ax: 16, ay: 16, fx: 0.0074, fy: 0.0055, p: 4.4, col: 'rgba(112,78,124,0.14)' },
  { x: 186, y: 112, r: 70, ax: 20, ay: 14, fx: 0.0038, fy: 0.0081, p: 5.2, col: 'rgba(46,58,120,0.26)' },
];

export function CloudBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const still = prefersReducedMotion();
    let raf = 0, last = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // 约 30fps，变化极慢，足够顺滑且更省电
      last = now;
      const t = now / 1000;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
      for (const b of BLOBS) {
        const cx = b.x + Math.sin(t * b.fx * 6.283 + b.p) * b.ax;
        const cy = b.y + Math.cos(t * b.fy * 6.283 + b.p) * b.ay;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
        g.addColorStop(0, b.col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      if (still) cancelAnimationFrame(raf);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="fog" aria-hidden />;
}

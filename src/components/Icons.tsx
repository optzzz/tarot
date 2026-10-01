import type { SVGProps } from 'react';

const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};

type P = SVGProps<SVGSVGElement>;

export const IconBack = (p: P) => (
  <svg {...base} {...p}><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
);

export const IconClose = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);

export const IconSend = (p: P) => (
  <svg {...base} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);

export const IconEye = ({ off, ...p }: P & { off?: boolean }) => (
  <svg {...base} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const CHEVRON = { right: 'M9.5 5.5 16 12l-6.5 6.5', left: 'M14.5 5.5 8 12l6.5 6.5', down: 'M6.5 9.5 12 15l5.5-5.5' };
export const IconChevron = ({ dir = 'right', ...p }: P & { dir?: keyof typeof CHEVRON }) => (
  <svg {...base} {...p}><path d={CHEVRON[dir]} /></svg>
);

/** 主入口：三张扇开的塔罗牌，前面一张带四芒星；后两张被前一张挡住的部分用遮罩去掉 */
export const IconCards = (p: P) => (
  <svg {...base} strokeWidth={1.35} {...p}>
    <defs>
      <mask id="cards-front">
        <rect width="24" height="24" fill="#fff" />
        <rect x="7.6" y="1.5" width="8.8" height="15.2" rx="1.9" fill="#000" />
      </mask>
    </defs>
    <g mask="url(#cards-front)">
      <rect x="8.25" y="4" width="7.5" height="12" rx="1.4" transform="rotate(-20 12 20.5)" />
      <rect x="8.25" y="4" width="7.5" height="12" rx="1.4" transform="rotate(20 12 20.5)" />
    </g>
    <rect x="8.25" y="4" width="7.5" height="12" rx="1.4" />
    <path d="M12 7.6c.22 1.5.78 2.06 2.3 2.3-1.52.24-2.08.8-2.3 2.3-.22-1.5-.78-2.06-2.3-2.3 1.52-.24 2.08-.8 2.3-2.3Z" strokeWidth={1} />
  </svg>
);

/** 四芒星，用在"追问"和"今日一牌"入口 */
export const IconSpark = (p: P) => (
  <svg {...base} {...p}><path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z" /></svg>
);

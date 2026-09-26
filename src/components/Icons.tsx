import type { SVGProps } from 'react';

const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};

type P = SVGProps<SVGSVGElement>;

export const IconHistory = (p: P) => (
  <svg {...base} {...p}><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3.5 4.5v3.9h3.9" /><path d="M12 7.5V12l3 2" /></svg>
);

export const IconDeck = (p: P) => (
  <svg {...base} {...p}><rect x="8.5" y="3.5" width="10" height="15" rx="1.6" /><path d="M5.6 6.2 4.4 6.6a1.4 1.4 0 0 0-.9 1.8l3.6 11a1.4 1.4 0 0 0 1.8.9l4.4-1.4" /></svg>
);

export const IconSettings = (p: P) => (
  <svg {...base} {...p}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>
);

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

export const IconChevron = ({ dir = 'right', ...p }: P & { dir?: 'left' | 'right' }) => (
  <svg {...base} {...p}><path d={dir === 'right' ? 'M9.5 5.5 16 12l-6.5 6.5' : 'M14.5 5.5 8 12l6.5 6.5'} /></svg>
);

/** 四芒星，用在"追问"和"今日一牌"入口 */
export const IconSpark = (p: P) => (
  <svg {...base} {...p}><path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z" /></svg>
);

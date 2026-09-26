import { createContext, useContext } from 'react';

export interface CardTarget {
  id: string;
  /** 在一次占卜里查看时，标出本次的正逆位；图鉴里查看时为 undefined */
  reversed?: boolean;
  position?: { name: string; desc: string };
  /** 图鉴里可左右切换的牌序列 */
  list?: string[];
}

export interface UI {
  openSettings(): void;
  openCard(t: CardTarget): void;
}

export const UIContext = createContext<UI>({ openSettings() {}, openCard() {} });
export const useUI = () => useContext(UIContext);

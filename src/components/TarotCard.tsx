import type { CSSProperties } from 'react';
import { CARD_BACK, CARD_MAP, CARD_RATIO, cardImage } from '../data/cards';

interface Props {
  id?: string;
  reversed?: boolean;
  faceUp: boolean;
  width: number;
  size?: 'lg' | 'sm';
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  /** 翻开时不播放翻转动画（例如打开历史记录） */
  instant?: boolean;
}

/** 一张可翻转的牌：背面是牌背，正面是牌面（逆位时牌面倒置） */
export function TarotCard({ id, reversed, faceUp, width, size = 'lg', className, style, onClick, instant }: Props) {
  const card = id ? CARD_MAP[id] : undefined;
  return (
    <div
      className={'tc' + (onClick ? ' clickable' : '') + (className ? ' ' + className : '')}
      style={{ width, height: width * CARD_RATIO, ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={faceUp && card ? `${card.name}${reversed ? '（逆位）' : ''}` : '牌背'}
    >
      <div className={'tc-inner' + (faceUp ? ' up' : '') + (instant ? ' instant' : '')}>
        <div className="tc-face tc-back">
          <img src={CARD_BACK} alt="" draggable={false} />
        </div>
        <div className="tc-face tc-front">
          {id && <img src={cardImage(id, size)} alt="" draggable={false} className={reversed ? 'rev' : undefined} />}
        </div>
      </div>
    </div>
  );
}

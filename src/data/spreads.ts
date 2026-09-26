import { CARD_RATIO } from './cards';

export type SpreadId = 'single' | 'three' | 'celtic' | 'daily';

export interface Position {
  name: string;
  /** 给 AI 和详情页看的位置含义 */
  desc: string;
  /** 牌中心坐标，单位是"一张牌的宽度" */
  x: number;
  y: number;
  /** 横放的牌（凯尔特十字第 2 张） */
  cross?: boolean;
}

export interface Spread {
  id: SpreadId;
  name: string;
  /** 首页选中时下方显示的一行说明 */
  hint: string;
  /** 牌下方显示位置名，或只显示序号 */
  labels: 'name' | 'number' | 'none';
  /** 整个牌阵的宽高（牌宽单位） */
  w: number;
  h: number;
  positions: Position[];
  /** 给 AI 的篇幅要求 */
  length: string;
  /** 牌阵里一张牌的最大宽度（px） */
  maxCw: number;
}

const H = CARD_RATIO;

// 凯尔特十字：左边十字，右边四张竖列（从下往上 7→10）
const cx = 2.016, cy = 3.642, gap = 0.14;
const staffX = 4.982, staffStep = H + 0.12;

export const SPREADS: Record<SpreadId, Spread> = {
  single: {
    id: 'single', name: '单张', hint: '一张牌，直接的指引', labels: 'none',
    w: 1, h: H, length: '300 字左右', maxCw: 260,
    positions: [{ name: '指引', desc: '对这个问题最核心的提示', x: 0.5, y: H / 2 }],
  },
  three: {
    id: 'three', name: '三张', hint: '过去 · 现在 · 未来', labels: 'name',
    w: 3.56, h: H, length: '600 字左右', maxCw: 230,
    positions: [
      { name: '过去', desc: '这件事的来由，以及已经形成的影响', x: 0.5, y: H / 2 },
      { name: '现在', desc: '当前的状态与问题的核心', x: 1.78, y: H / 2 },
      { name: '未来', desc: '照现在的方向发展下去的趋势', x: 3.06, y: H / 2 },
    ],
  },
  celtic: {
    id: 'celtic', name: '凯尔特十字', hint: '十张牌，适合复杂的问题', labels: 'number',
    w: 5.482, h: 4 * H + 3 * 0.12, length: '1000 到 1200 字', maxCw: 140,
    positions: [
      { name: '现状', desc: '当前处境的核心', x: cx, y: cy },
      { name: '阻碍', desc: '横在面前的挑战（有时也是助力）', x: cx, y: cy, cross: true },
      { name: '根基', desc: '问题深层的根源，潜意识里的因素', x: cx, y: cy + H + gap },
      { name: '过去', desc: '正在离开的影响', x: 0.5, y: cy },
      { name: '目标', desc: '意识层面的期望，可能达到的最好结果', x: cx, y: cy - H - gap },
      { name: '近未来', desc: '接下来即将发生的事', x: 3.532, y: cy },
      { name: '自我', desc: '你的态度，以及你在这件事中的位置', x: staffX, y: H / 2 + 3 * staffStep },
      { name: '环境', desc: '他人与外在环境的影响', x: staffX, y: H / 2 + 2 * staffStep },
      { name: '希望与恐惧', desc: '内心的期待与担忧', x: staffX, y: H / 2 + staffStep },
      { name: '结果', desc: '沿着目前的方向，最可能的结局', x: staffX, y: H / 2 },
    ],
  },
  daily: {
    id: 'daily', name: '今日一牌', hint: '', labels: 'none',
    w: 1, h: H, length: '150 到 250 字', maxCw: 260,
    positions: [{ name: '今日', desc: '今天需要留意的能量与提示', x: 0.5, y: H / 2 }],
  },
};

/** 首页可选的牌阵 */
export const SPREAD_CHOICES: SpreadId[] = ['single', 'three', 'celtic'];

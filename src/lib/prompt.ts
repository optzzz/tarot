import { CARD_MAP, SUIT_NAMES } from '../data/cards';
import { SPREADS } from '../data/spreads';
import type { Reading } from './store';
import type { ChatMessage } from './ai';

export const SYSTEM_PROMPT = `你是一位经验丰富的塔罗占卜师，熟悉韦特塔罗体系。你的解读温和、坦诚、具体，不故弄玄虚。

解读原则：
- 紧扣提问者的问题和每张牌所在的位置来讲，不要泛泛复述牌义。牌义参考只是基础，要结合牌面画面、位置和问题给出你自己的理解。
- 留意牌与牌之间的关系：大阿尔卡那的数量、花色（元素）的分布、数字的呼应、正逆位的比例、相邻位置的牌如何互相影响。
- 逆位理解为能量受阻、内化、延迟或过度，而不是简单的"坏"。
- 不做绝对化的预言，把结果表述为趋势和可能性，并指出提问者可以主动做些什么。
- 涉及健康、法律、投资等问题时，提醒对方以专业人士的意见为准。
- 用中文回答，语气像面对面交谈。可以用 Markdown 的小标题（###）、加粗和列表；不要用表格，不要用 emoji。
- 对方追问时，围绕这次抽到的牌直接回答追问，篇幅适中，不必重复之前说过的内容。`;

function describeCards(r: Reading): string {
  const spread = SPREADS[r.spread];
  return r.cards.map((c, i) => {
    const card = CARD_MAP[c.id];
    const pos = spread.positions[i];
    const m = c.reversed ? card.rev : card.up;
    const suit = card.suit === 'major' ? '大阿尔卡那' : `小阿尔卡那 · ${SUIT_NAMES[card.suit]}`;
    return `${i + 1}. 【${pos.name}】${pos.desc}
   ${card.name}（${card.en}，${suit}）· ${c.reversed ? '逆位' : '正位'}
   参考牌义：${m.k.join('、')}。${m.m}`;
  }).join('\n');
}

export function initialMessage(r: Reading): string {
  const spread = SPREADS[r.spread];
  const cards = describeCards(r);

  if (r.spread === 'daily') {
    return `这是今天（${r.day}）的"今日一牌"。

${cards}

请给出今天的指引：这张牌今天在提醒什么、适合做什么、需要留意什么。篇幅 ${spread.length}，不需要小标题。`;
  }

  const q = r.question.trim() || '（没有写出具体问题，请给出整体的指引）';
  const structure = r.cards.length === 1
    ? '先解读这张牌在这个问题里的含义，再给出具体建议。'
    : `请按以下结构：
### 逐张解读
每张牌以"**位置 · 牌名（正位/逆位）**"开头，结合位置和问题解读。
### 综合解读
把整组牌连起来，直接回答问题。
### 建议
两三条具体可行的建议。`;

  return `问题：${q}
牌阵：${spread.name}${spread.hint ? `（${spread.hint}）` : ''}
抽到的牌：
${cards}

${structure}
篇幅 ${spread.length}。`;
}

/** 组装一次对话：首次解读 + 之前的追问，最后是这次要发的内容 */
export function buildMessages(r: Reading, upTo: number): ChatMessage[] {
  const msgs: ChatMessage[] = [{ role: 'user', content: initialMessage(r) }];
  if (upTo < 0) return msgs;
  msgs.push({ role: 'assistant', content: r.ai ?? '' });
  for (let i = 0; i <= upTo; i++) {
    const f = r.followups[i];
    msgs.push({ role: 'user', content: f.q });
    if (i < upTo) msgs.push({ role: 'assistant', content: f.a });
  }
  return msgs;
}

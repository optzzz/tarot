import { Fragment, type ReactNode } from 'react';

// 只支持解读里会用到的少量 Markdown：小标题、段落、列表、引用、分隔线、加粗/斜体。
// 全部渲染成 React 元素，不插入 HTML，模型输出里的标签不会被执行。

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|`([^`]+)`/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] || m[2]) out.push(<strong key={`${key}-${i++}`}>{m[1] ?? m[2]}</strong>);
    else if (m[3]) out.push(<em key={`${key}-${i++}`}>{m[3]}</em>);
    else out.push(m[4]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, streaming }: { text: string; streaming?: boolean }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join('\n'), `p${blocks.length}`)}</p>);
    para = [];
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, j) => <li key={j}>{inline(it, `l${blocks.length}-${j}`)}</li>);
      blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    }
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) blocks.push(<blockquote key={blocks.length}>{inline(quote.join(''), `q${blocks.length}`)}</blockquote>);
    quote = [];
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushAll(); continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^#{1,6}\s+(.*)$/))) {
      flushAll();
      blocks.push(<h3 key={blocks.length}>{inline(m[1].replace(/\*\*/g, ''), `h${blocks.length}`)}</h3>);
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushAll();
      blocks.push(<hr key={blocks.length} />);
    } else if ((m = line.match(/^[-*•]\s+(.*)$/)) || (m = line.match(/^(\d+)[.)、]\s*(.*)$/))) {
      const ordered = m.length === 3;
      const content = ordered ? m[2] : m[1];
      flushPara(); flushQuote();
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push(content);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara(); flushList();
      quote.push(m[1]);
    } else {
      flushList(); flushQuote();
      para.push(line);
    }
  }
  flushAll();

  return (
    <div className={'md' + (streaming ? ' streaming' : '')}>
      {blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}
    </div>
  );
}

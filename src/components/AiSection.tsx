import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { streamChat } from '../lib/ai';
import { activeConfig, isConfigured } from '../lib/ai/providers';
import { buildMessages, SYSTEM_PROMPT } from '../lib/prompt';
import { updateReading, useAiSettings, type FollowUp, type Reading } from '../lib/store';
import { useUI } from '../ui';
import { IconSend, IconSpark } from './Icons';
import { Markdown } from './Markdown';

type Status = 'idle' | 'waiting' | 'thinking' | 'streaming' | 'error';

export function AiSection({ reading, live }: { reading: Reading; live?: boolean }) {
  const settings = useAiSettings();
  const cfg = activeConfig(settings);
  const ready = isConfigured(cfg);
  const { openSettings } = useUI();

  const [text, setText] = useState(reading.ai ?? '');
  const [followups, setFollowups] = useState<FollowUp[]>(reading.followups);
  const [status, setStatus] = useState<Status>('idle');
  const [target, setTarget] = useState(-1); // -1 首次解读；>=0 第几条追问
  const [error, setError] = useState('');
  const ctrl = useRef<AbortController | null>(null);
  const started = useRef(false);
  const lastRun = useRef<{ idx: number; base: Reading } | null>(null);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const busy = status === 'waiting' || status === 'thinking' || status === 'streaming';

  async function run(idx: number, base: Reading) {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    lastRun.current = { idx, base };
    setTarget(idx);
    setStatus('waiting');
    setError('');
    let acc = '';
    const show = () => {
      if (idx < 0) setText(acc);
      else setFollowups(fs => fs.map((f, i) => (i === idx ? { ...f, a: acc } : f)));
    };
    const persist = () => {
      if (idx < 0) updateReading(base.id, { ai: acc });
      else updateReading(base.id, { followups: base.followups.map((f, i) => (i === idx ? { ...f, a: acc } : f)) });
    };
    try {
      await streamChat(cfgRef.current, {
        system: SYSTEM_PROMPT,
        messages: buildMessages(base, idx),
        signal: c.signal,
        onThinking: () => setStatus(s => (s === 'waiting' ? 'thinking' : s)),
        onText: t => { acc += t; setStatus('streaming'); show(); },
      });
      show();
      persist();
      setStatus(acc ? 'idle' : 'error');
      if (!acc) setError('没有收到回复');
    } catch (e) {
      show();
      if (acc) persist(); // 中途停止或出错，已经收到的部分也保留
      if (c.signal.aborted) setStatus('idle');
      else { setError(e instanceof Error ? e.message : String(e)); setStatus('error'); }
    } finally {
      if (ctrl.current === c) ctrl.current = null;
    }
  }

  // 现场占卜：翻完牌自动开始；如果当时还没设置 AI，设置好之后自动开始
  useEffect(() => {
    if (live && ready && !text && !started.current) {
      started.current = true;
      run(-1, reading);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, ready]);

  useEffect(() => () => ctrl.current?.abort(), []);

  function retry() {
    const l = lastRun.current;
    if (!l) return;
    if (l.idx < 0) setText('');
    run(l.idx, l.base);
  }

  function ask(q: string) {
    const base: Reading = { ...reading, ai: text, followups: [...followups, { q, a: '' }] };
    setFollowups(base.followups);
    updateReading(reading.id, { followups: base.followups });
    run(base.followups.length - 1, base);
  }

  const pending = (idx: number) =>
    target === idx && (status === 'waiting' || status === 'thinking') ? (
      <div className="ai-pending"><IconSpark className="spin" width={15} height={15} />{status === 'thinking' ? '思考中…' : '正在解读…'}</div>
    ) : null;

  return (
    <section className="ai">
      <div className="section-label">解读</div>

      {!ready && !text && (
        <div className="ai-setup">
          <p>设置 AI 服务后，这里会结合你的问题和这组牌给出综合解读。</p>
          <button className="btn" onClick={openSettings}>去设置</button>
        </div>
      )}
      {ready && !text && !busy && status !== 'error' && (
        <button className="btn" onClick={() => { started.current = true; run(-1, reading); }}>生成解读</button>
      )}

      {pending(-1)}
      {text && <Markdown text={text} streaming={status === 'streaming' && target === -1} />}

      {followups.map((f, i) => (
        <div className="fu" key={i}>
          <div className="fu-q">{f.q}</div>
          {pending(i)}
          {f.a && <Markdown text={f.a} streaming={status === 'streaming' && target === i} />}
        </div>
      ))}

      {busy && <button className="text-btn ai-stop" onClick={() => ctrl.current?.abort()}>停止</button>}
      {status === 'error' && (
        <div className="ai-error">
          <span>{error}</span>
          <button className="text-btn" onClick={retry}>重试</button>
          <button className="text-btn" onClick={openSettings}>检查设置</button>
        </div>
      )}

      {text && !busy && ready && <AskBox onAsk={ask} />}
    </section>
  );
}

function AskBox({ onAsk }: { onAsk: (q: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (open) ta.current?.focus(); }, [open]);

  function autosize() {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }

  function send() {
    const v = q.trim();
    if (!v) return;
    setQ('');
    setOpen(false);
    onAsk(v);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return; // 中文输入法选词时的回车不发送
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  return (
    <div className={'ask' + (open ? ' open' : '')}>
      <button className="ask-trigger" onClick={() => setOpen(true)} tabIndex={open ? -1 : 0} aria-hidden={open}>
        <span className="mini-card"><IconSpark width={9} height={9} /></span>
        追问
      </button>
      <div className="ask-box" aria-hidden={!open}>
        <textarea
          ref={ta}
          rows={1}
          value={q}
          placeholder="关于这组牌，还想问什么？"
          onChange={e => { setQ(e.target.value); autosize(); }}
          onKeyDown={onKey}
          onBlur={() => { if (!q.trim()) setOpen(false); }}
          tabIndex={open ? 0 : -1}
        />
        <button className="send" onMouseDown={e => e.preventDefault()} onClick={send} disabled={!q.trim()} aria-label="发送" tabIndex={open ? 0 : -1}>
          <IconSend width={18} height={18} />
        </button>
      </div>
    </div>
  );
}

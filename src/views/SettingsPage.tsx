import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { listModels, testConnection } from '../lib/ai';
import { PRESETS, activeConfig, presetOf } from '../lib/ai/providers';
import { getAiSettings, setAiSettings, useAiSettings, type ProviderConfig } from '../lib/store';
import { IconChevron, IconEye } from '../components/Icons';

export function SettingsPage() {
  const s = useAiSettings();
  const preset = presetOf(s.provider);
  const cfg = activeConfig(s);
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [test, setTest] = useState<{ state: 'idle' | 'running' | 'ok' | 'fail'; msg?: string }>({ state: 'idle' });
  const testSeq = useRef(0);

  function update(patch: Partial<ProviderConfig>) {
    const cur = getAiSettings();
    const p = presetOf(cur.provider);
    const prev = cur.configs[p.id] ?? { baseUrl: p.baseUrl, apiKey: '', model: p.model };
    setAiSettings({ ...cur, configs: { ...cur.configs, [p.id]: { ...prev, ...patch } } });
    setTest({ state: 'idle' });
  }

  function switchProvider(id: string) {
    setAiSettings({ ...getAiSettings(), provider: id });
    setModels([]);
    setTest({ state: 'idle' });
  }

  // 填好地址和 Key 后拉一次模型列表，供"模型"右侧展开选择
  useEffect(() => {
    if (!cfg.baseUrl || !cfg.apiKey) { setModels([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      listModels(cfg, ctrl.signal).then(setModels).catch(() => setModels([]));
    }, 600);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.provider, cfg.baseUrl, cfg.apiKey]);

  async function runTest() {
    const seq = ++testSeq.current;
    setTest({ state: 'running' });
    try {
      await testConnection(activeConfig(getAiSettings()));
      if (seq === testSeq.current) setTest({ state: 'ok', msg: '连接成功' });
    } catch (e) {
      if (seq === testSeq.current) setTest({ state: 'fail', msg: e instanceof Error ? e.message : String(e) });
    }
  }

  const canTest = !!(cfg.baseUrl && cfg.apiKey && cfg.model);

  return (
    <main className="page settings-page">
      <div className="settings-form">
        <label className="field">
          <span>服务</span>
          <div className="select">
            <select value={preset.id} onChange={e => switchProvider(e.target.value)}>
              {PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </label>

        <label className="field">
          <span>接口地址</span>
          <input
            value={cfg.baseUrl}
            placeholder="https://…/v1"
            onChange={e => update({ baseUrl: e.target.value })}
            spellCheck={false} autoComplete="off" inputMode="url"
          />
        </label>

        <label className="field">
          <span>API Key</span>
          <div className="with-btn">
            <input
              type={showKey ? 'text' : 'password'}
              value={cfg.apiKey}
              placeholder="sk-…"
              onChange={e => update({ apiKey: e.target.value })}
              spellCheck={false} autoComplete="off"
            />
            <button type="button" className="icon-btn" onClick={() => setShowKey(v => !v)} aria-label={showKey ? '隐藏' : '显示'}>
              <IconEye off={showKey} width={18} height={18} />
            </button>
          </div>
        </label>

        <div className="field">
          <span>模型</span>
          <ModelPicker value={cfg.model} models={models} onChange={m => update({ model: m })} />
        </div>

        <div className="dialog-foot">
          <button className="btn" onClick={runTest} disabled={!canTest || test.state === 'running'}>
            {test.state === 'running' ? '测试中…' : '测试连接'}
          </button>
          {test.msg && <span className={'test-msg ' + test.state}>{test.msg}</span>}
        </div>
        <p className="note">Key 只保存在这台设备上，每台设备需要各填一次。</p>
      </div>
    </main>
  );
}

/**
 * 模型输入框：可以直接输入；右侧按钮展开完整列表（不按当前内容过滤），
 * 输入时才按输入内容筛选。列表很长时（OpenRouter 有几百个）在框内滚动。
 */
function ModelPicker({ value, models, onChange }: { value: string; models: string[]; onChange: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    addEventListener('pointerdown', onDown);
    // 展开时把当前选中的那一项滚到可见处
    listRef.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
    return () => removeEventListener('pointerdown', onDown);
  }, [open]);

  const q = value.trim().toLowerCase();
  const list = filtering && q ? models.filter(m => m.toLowerCase().includes(q)) : models;

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown' && models.length) { setFiltering(false); setOpen(true); }
  }

  return (
    <div className="combo" ref={wrap}>
      <input
        value={value}
        placeholder={models.length ? '直接输入，或从右侧列表选择' : '填好地址和 Key 后可从列表选择'}
        onChange={e => { onChange(e.target.value); setFiltering(true); setOpen(models.length > 0); }}
        onKeyDown={onKey}
        spellCheck={false} autoComplete="off"
      />
      <button
        type="button"
        className={'icon-btn combo-toggle' + (open ? ' open' : '')}
        onClick={() => {
          // 正在按输入筛选时点它：改为显示全部；否则开/关
          if (open && filtering) setFiltering(false);
          else { setFiltering(false); setOpen(o => !o); }
        }}
        disabled={!models.length}
        aria-label="展开模型列表"
        aria-expanded={open}
      >
        <IconChevron dir="down" width={18} height={18} />
      </button>
      {open && list.length > 0 && (
        <ul className="combo-list" role="listbox" ref={listRef}>
          {list.map(m => (
            <li
              key={m}
              role="option"
              aria-selected={m === value}
              className={m === value ? 'on' : undefined}
              onClick={() => { onChange(m); setOpen(false); setFiltering(false); }}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

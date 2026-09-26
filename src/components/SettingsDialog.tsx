import { useEffect, useRef, useState } from 'react';
import { listModels, testConnection } from '../lib/ai';
import { PRESETS, activeConfig, presetOf } from '../lib/ai/providers';
import { getAiSettings, setAiSettings, useAiSettings, type ProviderConfig } from '../lib/store';
import { useBackClose } from '../lib/hooks';
import { IconClose, IconEye } from './Icons';

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const close = useBackClose(open, onClose);
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

  // 填好地址和 Key 后，悄悄拉一次模型列表，供"模型"输入框联想
  useEffect(() => {
    if (!open || !cfg.baseUrl || !cfg.apiKey) { setModels([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      listModels(cfg, ctrl.signal).then(setModels).catch(() => setModels([]));
    }, 600);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, s.provider, cfg.baseUrl, cfg.apiKey]);

  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  });

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
    <div className={'overlay settings' + (open ? ' open' : '')} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="AI 设置">
        <div className="dialog-head">
          <h2>AI 设置</h2>
          <button className="icon-btn" onClick={close} aria-label="关闭"><IconClose /></button>
        </div>

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

        <label className="field">
          <span>模型</span>
          <input
            value={cfg.model}
            list="model-list"
            placeholder={models.length ? '从列表选择或直接输入' : '例如 deepseek-chat'}
            onChange={e => update({ model: e.target.value })}
            spellCheck={false} autoComplete="off"
          />
          <datalist id="model-list">{models.map(m => <option key={m} value={m} />)}</datalist>
        </label>

        <div className="dialog-foot">
          <button className="btn" onClick={runTest} disabled={!canTest || test.state === 'running'}>
            {test.state === 'running' ? '测试中…' : '测试连接'}
          </button>
          {test.msg && <span className={'test-msg ' + test.state}>{test.msg}</span>}
        </div>
        <p className="note">Key 只保存在这台设备的浏览器里，每台设备需要各填一次。</p>
      </div>
    </div>
  );
}

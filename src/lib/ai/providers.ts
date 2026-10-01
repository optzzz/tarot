import type { AiSettings, ProviderConfig } from '../store';

export type ProviderKind = 'openai' | 'anthropic';

export interface Preset {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
}

// 这些服务都实测过允许网页直接调用（CORS）。模型默认留空：填好 Key 后由用户输入或从列表里选
export const PRESETS: Preset[] = [
  { id: 'deepseek', name: 'DeepSeek', kind: 'openai', baseUrl: 'https://api.deepseek.com', model: '' },
  { id: 'qwen', name: '通义千问', kind: 'openai', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: '' },
  { id: 'zhipu', name: '智谱', kind: 'openai', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: '' },
  { id: 'siliconflow', name: '硅基流动', kind: 'openai', baseUrl: 'https://api.siliconflow.cn/v1', model: '' },
  { id: 'openrouter', name: 'OpenRouter', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: '' },
  { id: 'claude', name: 'Claude', kind: 'anthropic', baseUrl: 'https://api.anthropic.com', model: '' },
  { id: 'custom', name: '其他（OpenAI 兼容接口）', kind: 'openai', baseUrl: '', model: '' },
];

export function presetOf(id: string): Preset {
  return PRESETS.find(p => p.id === id) ?? PRESETS[PRESETS.length - 1];
}

export interface ActiveConfig extends ProviderConfig {
  kind: ProviderKind;
  providerName: string;
}

export function activeConfig(s: AiSettings): ActiveConfig {
  const p = presetOf(s.provider);
  const c = s.configs[p.id];
  return {
    kind: p.kind,
    providerName: p.name,
    baseUrl: (c?.baseUrl ?? p.baseUrl).trim().replace(/\/+$/, ''),
    apiKey: (c?.apiKey ?? '').trim(),
    model: (c?.model ?? p.model).trim(),
  };
}

export function isConfigured(c: ActiveConfig): boolean {
  return !!(c.baseUrl && c.apiKey && c.model);
}

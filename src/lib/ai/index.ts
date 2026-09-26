import { streamOpenAI, listOpenAIModels } from './openaiCompat';
import type { ActiveConfig } from './providers';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamRequest {
  system: string;
  messages: ChatMessage[];
  signal: AbortSignal;
  onText: (chunk: string) => void;
  onThinking?: () => void;
}

export async function streamChat(cfg: ActiveConfig, req: StreamRequest): Promise<void> {
  if (cfg.kind === 'anthropic') {
    const { streamAnthropic } = await import('./anthropic');
    return streamAnthropic(cfg, req);
  }
  return streamOpenAI(cfg, req);
}

export async function listModels(cfg: ActiveConfig, signal?: AbortSignal): Promise<string[]> {
  if (cfg.kind === 'anthropic') {
    const { listAnthropicModels } = await import('./anthropic');
    return listAnthropicModels(cfg);
  }
  return listOpenAIModels(cfg, signal);
}

/** 发一条很短的请求，确认地址、Key、模型都能用 */
export async function testConnection(cfg: ActiveConfig): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  let got = '';
  try {
    await streamChat(cfg, {
      system: '用一句话回答。',
      messages: [{ role: 'user', content: '你好，请回复"连接成功"。' }],
      signal: ctrl.signal,
      onText: t => {
        got += t;
        if (got.length > 20) ctrl.abort();
      },
    });
  } catch (e) {
    if (!got) throw ctrl.signal.aborted ? new Error('超时，没有收到回复') : e;
  } finally {
    clearTimeout(timer);
  }
  if (!got) throw new Error('没有收到回复');
  return got;
}

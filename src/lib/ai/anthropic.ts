// Claude 官方接口，走 Anthropic 官方 SDK。只在选了 Claude 时才按需加载这个文件。
import Anthropic from '@anthropic-ai/sdk';
import type { ActiveConfig } from './providers';
import type { StreamRequest } from './index';

// 这些模型的安全分类器偶尔会误拒；带上服务端 fallbacks，被拒时自动换推荐的备用模型接着答
const FALLBACK_MODELS = new Set(['claude-opus-5', 'claude-opus-5-5', 'claude-fable-5-1', 'claude-fable-5']);

function client(cfg: ActiveConfig) {
  // 个人使用：Key 由用户自己填、只存在本机浏览器里，所以允许浏览器直连
  return new Anthropic({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl, dangerouslyAllowBrowser: true, maxRetries: 1 });
}

function friendly(err: unknown): Error {
  if (err instanceof Anthropic.APIError) return new Error(`${err.status ?? ''} ${err.message}`.trim());
  return err instanceof Error ? err : new Error(String(err));
}

export async function streamAnthropic(cfg: ActiveConfig, req: StreamRequest): Promise<void> {
  const withFallback = FALLBACK_MODELS.has(cfg.model);
  try {
    const stream = client(cfg).beta.messages.stream(
      {
        model: cfg.model,
        max_tokens: 64000,
        system: req.system,
        messages: req.messages,
        ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      },
      { signal: req.signal },
    );
    for await (const ev of stream) {
      if (ev.type !== 'content_block_delta') continue;
      if (ev.delta.type === 'text_delta') req.onText(ev.delta.text);
      else if (ev.delta.type === 'thinking_delta') req.onThinking?.();
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new Error('模型拒绝了这次请求，可以换个问法再试');
  } catch (e) {
    if (req.signal.aborted) return;
    throw friendly(e);
  }
}

export async function listAnthropicModels(cfg: ActiveConfig): Promise<string[]> {
  const ids: string[] = [];
  try {
    for await (const m of client(cfg).models.list()) ids.push(m.id);
  } catch (e) {
    throw friendly(e);
  }
  return ids;
}

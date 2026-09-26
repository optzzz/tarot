// OpenAI 兼容格式（DeepSeek、通义、智谱、硅基流动、OpenRouter 等）
import type { ActiveConfig } from './providers';
import type { StreamRequest } from './index';

async function errorText(res: Response): Promise<string> {
  const body = await res.text().catch(() => '');
  try {
    const j = JSON.parse(body);
    return j.error?.message ?? j.message ?? j.msg ?? body;
  } catch {
    return body || res.statusText;
  }
}

export async function streamOpenAI(cfg: ActiveConfig, req: StreamRequest): Promise<void> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    signal: req.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      stream: true,
      temperature: 0.8,
      messages: [{ role: 'system', content: req.system }, ...req.messages],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${await errorText(res)}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      let json: any;
      try { json = JSON.parse(data); } catch { continue; }
      if (json.error) throw new Error(json.error.message ?? String(json.error));
      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;
      // 推理模型（如 deepseek-reasoner）会先输出思考过程，只提示"思考中"，不显示内容
      if (delta.reasoning_content) req.onThinking?.();
      if (delta.content) req.onText(delta.content);
    }
  }
}

export async function listOpenAIModels(cfg: ActiveConfig, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${cfg.baseUrl}/models`, {
    signal,
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await errorText(res)}`);
  const j = await res.json();
  return (j.data ?? []).map((m: { id: string }) => m.id).filter(Boolean).sort();
}

import { useSyncExternalStore } from 'react';
import type { DrawnCard } from './random';
import type { SpreadId } from '../data/spreads';
import type { HubTab } from './router';

// ---------- localStorage 读写（隐私模式等情况下可能抛错，一律兜底） ----------

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function createStore<T>(key: string, fallback: T) {
  let value = read(key, fallback);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(l => l());
  // 另一个标签页改了数据时同步过来
  window.addEventListener('storage', e => {
    if (e.key === key) { value = read(key, fallback); emit(); }
  });
  return {
    get: () => value,
    set(next: T) { value = next; write(key, next); emit(); },
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}

// ---------- 占卜记录 ----------

export interface FollowUp {
  q: string;
  a: string;
}

export interface Reading {
  id: string;
  time: number;
  question: string;
  spread: SpreadId;
  cards: DrawnCard[];
  ai?: string;
  followups: FollowUp[];
  /** 每日一牌所属的日期 YYYY-MM-DD */
  day?: string;
}

const history = createStore<Reading[]>('tarot.history.v1', []);

export function useHistory(): Reading[] {
  return useSyncExternalStore(history.subscribe, history.get);
}

export function getReading(id: string): Reading | undefined {
  return history.get().find(r => r.id === id);
}

export function saveReading(r: Reading) {
  const list = history.get();
  const i = list.findIndex(x => x.id === r.id);
  history.set(i < 0 ? [r, ...list] : list.map(x => (x.id === r.id ? r : x)));
}

export function updateReading(id: string, patch: Partial<Reading>) {
  const r = getReading(id);
  if (r) saveReading({ ...r, ...patch });
}

export function deleteReading(id: string) {
  history.set(history.get().filter(r => r.id !== id));
}

export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function findDaily(day = todayKey()): Reading | undefined {
  return history.get().find(r => r.spread === 'daily' && r.day === day);
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- AI 设置 ----------

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AiSettings {
  provider: string;
  /** 每个服务各自记住地址、Key 和模型，切换时不用重填 */
  configs: Record<string, ProviderConfig>;
}

const settings = createStore<AiSettings>('tarot.ai.v1', { provider: 'deepseek', configs: {} });

export function useAiSettings(): AiSettings {
  return useSyncExternalStore(settings.subscribe, settings.get);
}

export const getAiSettings = settings.get;
export const setAiSettings = settings.set;

// ---------- 小偏好 ----------

export const prefs = {
  get lastSpread(): SpreadId { return read<SpreadId>('tarot.lastSpread', 'three'); },
  set lastSpread(v: SpreadId) { write('tarot.lastSpread', v); },
  /** 右上角入口上次停留的那一页 */
  get lastTab(): HubTab { return read<HubTab>('tarot.lastTab', 'history'); },
  set lastTab(v: HubTab) { write('tarot.lastTab', v); },
};

/** 用系统加密级随机数，避免 Math.random 的偏差 */
export function randInt(n: number): number {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % n;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface DrawnCard {
  id: string;
  reversed: boolean;
}

/** 洗一副牌：打乱顺序，并像真实洗牌那样让每张牌随机正逆 */
export function shuffleDeck(ids: readonly string[]): DrawnCard[] {
  return shuffle(ids).map(id => ({ id, reversed: randInt(2) === 1 }));
}

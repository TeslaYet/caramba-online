type WindowLimit = { limit: number; windowMs: number };

export const RATE_LIMITS = {
  "room-create": { limit: 8, windowMs: 60 * 60 * 1000 },
  "room-join": { limit: 30, windowMs: 10 * 60 * 1000 },
  chat: { limit: 12, windowMs: 60 * 1000 },
  action: { limit: 90, windowMs: 60 * 1000 },
} as const satisfies Record<string, WindowLimit>;

type LimitName = keyof typeof RATE_LIMITS;

function buckets(): Map<string, number[]> {
  const globalStore = globalThis as typeof globalThis & { __carrambaRate?: Map<string, number[]> };
  if (!globalStore.__carrambaRate) {
    globalStore.__carrambaRate = new Map();
  }
  return globalStore.__carrambaRate;
}

export function consumeRateLimit(key: string, name: LimitName, now = Date.now()): boolean {
  const rule = RATE_LIMITS[name];
  const id = `${name}:${key}`;
  const store = buckets();
  const recent = (store.get(id) ?? []).filter((stamp) => now - stamp < rule.windowMs);
  if (recent.length >= rule.limit) {
    store.set(id, recent);
    return false;
  }
  recent.push(now);
  store.set(id, recent);
  return true;
}

export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || "unknown";
}

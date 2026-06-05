type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const CACHE = new Map<string, CacheEntry<unknown>>();

export function getCachedValue<T>(key: string): T | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    CACHE.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  CACHE.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function deleteCachedValue(key: string) {
  CACHE.delete(key);
}

export async function withTimeBudget<T>(task: Promise<T>, timeoutMs: number, fallback: () => T | Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      task,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
          void Promise.resolve(fallback()).then(resolve);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

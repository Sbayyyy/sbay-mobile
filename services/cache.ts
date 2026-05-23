import AsyncStorage from "@react-native-async-storage/async-storage";

type CacheEntry<T> = { data: T; expiresAt: number };

const KEY_PREFIX = "sbay.cache.";

export async function setCache<T>(key: string, data: T, ttlMs: number): Promise<void> {
  const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs };
  await AsyncStorage.setItem(`${KEY_PREFIX}${key}`, JSON.stringify(entry));
}

export async function getCache<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${key}`);
  if (!raw) return null;
  const entry = JSON.parse(raw) as CacheEntry<T>;
  if (Date.now() > entry.expiresAt) return null;
  return entry.data;
}

export async function clearCache(key: string): Promise<void> {
  await AsyncStorage.removeItem(`${KEY_PREFIX}${key}`);
}

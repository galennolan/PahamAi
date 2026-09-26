import localforage from 'localforage';

localforage.config({ name: 'paham-ai', storeName: 'offline' });

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return (await localforage.getItem<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    await localforage.setItem(key, value);
  } catch {
    // abaikan jika penyimpanan penuh
  }
}

export async function enqueuePending(op: {
  id: string;
  table: string;
  action: 'insert' | 'update';
  payload: Record<string, unknown>;
  at: string;
}): Promise<void> {
  const key = 'pending-ops';
  const existing = (await cacheGet<Array<typeof op>>(key)) ?? [];
  await cacheSet(key, [...existing, op]);
}

export async function dequeuePending(): Promise<
  Array<{ id: string; table: string; action: 'insert' | 'update'; payload: Record<string, unknown>; at: string }>
> {
  const key = 'pending-ops';
  const existing = (await cacheGet<Array<{ id: string; table: string; action: 'insert' | 'update'; payload: Record<string, unknown>; at: string }>>(key)) ?? [];
  await cacheSet(key, []);
  return existing;
}

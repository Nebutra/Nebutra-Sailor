/**
 * localStorage / sessionStorage wrappers that never throw (Safari private mode,
 * quota exceeded, disabled storage).
 */

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function resolveStorage(
  kind: "local" | "session",
  override?: StorageLike | null,
): StorageLike | null {
  if (override !== undefined) return override;
  if (typeof globalThis === "undefined") return null;
  try {
    const g = globalThis as typeof globalThis & {
      localStorage?: Storage;
      sessionStorage?: Storage;
    };
    const storage = kind === "local" ? g.localStorage : g.sessionStorage;
    if (!storage) return null;
    // Probe write capability (Safari private mode can throw on setItem)
    const probe = "__nebutra_storage_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function safeGetItem(
  key: string,
  kind: "local" | "session" = "local",
  storage?: StorageLike | null,
): string | null {
  const store = resolveStorage(kind, storage);
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(
  key: string,
  value: string,
  kind: "local" | "session" = "local",
  storage?: StorageLike | null,
): boolean {
  const store = resolveStorage(kind, storage);
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(
  key: string,
  kind: "local" | "session" = "local",
  storage?: StorageLike | null,
): boolean {
  const store = resolveStorage(kind, storage);
  if (!store) return false;
  try {
    store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function safeGetJson<T>(
  key: string,
  kind: "local" | "session" = "local",
  storage?: StorageLike | null,
): T | null {
  const raw = safeGetItem(key, kind, storage);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function safeSetJson(
  key: string,
  value: unknown,
  kind: "local" | "session" = "local",
  storage?: StorageLike | null,
): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value), kind, storage);
  } catch {
    return false;
  }
}

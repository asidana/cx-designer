/**
 * Local-first persistence.
 *
 * Two layers behind one small API:
 *
 *   localStorage  — a synchronous **cache**, so the app boots with real
 *                   configuration on the first paint (no async gap, no flash
 *                   of defaults).
 *   IndexedDB     — the durable **store**. Survives localStorage eviction and
 *                   quota pressure, and holds large/structured data happily
 *                   (mock simulations live in `src/mock/db.ts`; configuration
 *                   lives here).
 *
 * Reads on boot come from the cache (`getSync`); `hydrate` reconciles from the
 * durable store when the cache is empty or was cleared. Writes go to both, so
 * nothing is ever lost to a single layer.
 *
 * Both layers degrade to a no-op when unavailable (SSR, private mode), and the
 * caller keeps a working in-memory session either way.
 */

const DB_NAME = 'agentic-cx-designer-config';
const DB_VERSION = 1;
const STORE = 'kv';

const hasIDB = typeof indexedDB !== 'undefined';
const hasLS = typeof localStorage !== 'undefined';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (!hasIDB) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'k' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function durableTx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest
): Promise<T | undefined> {
  return openDb().then(
    db =>
      new Promise<T | undefined>(resolve => {
        if (!db) {
          resolve(undefined);
          return;
        }
        try {
          const t = db.transaction(STORE, mode);
          const req = run(t.objectStore(STORE));
          req.onsuccess = () => resolve(req.result as T);
          req.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      })
  );
}

/** True when the durable IndexedDB layer is usable in this environment. */
export function durableAvailable(): boolean {
  return hasIDB;
}

/** Synchronous read from the boot cache. */
export function getSync<T>(key: string, fallback: T): T {
  if (!hasLS) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Write to both layers. The durable write is fire-and-forget. */
export function set(key: string, value: unknown): void {
  if (hasLS) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // cache full/unavailable — the durable layer still has it
    }
  }
  void durableTx('readwrite', (s) => s.put({ k: key, v: value }));
}

/** Remove from both layers. */
export function remove(key: string): void {
  if (hasLS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  void durableTx('readwrite', (s) => s.delete(key));
}

/** Read the durable copy directly (bypassing the cache). */
export function getDurable<T>(key: string): Promise<T | undefined> {
  return durableTx<{ k: string; v: T }>('readonly', (s) => s.get(key)).then(row => row?.v);
}

/**
 * Reconcile the cache from the durable store and return the durable value (or
 * undefined when there is none). Callers adopt the value and re-render.
 */
export function hydrate<T>(key: string): Promise<T | undefined> {
  return getDurable<T>(key).then(value => {
    if (value === undefined) return undefined;
    if (hasLS) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    }
    return value;
  });
}

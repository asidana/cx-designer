/**
 * Mock IndexedDB — local store for simulation data.
 *
 * Stores (no backend needed):
 * - `personas`: caller simulator personas
 * - `scenarios`: multi-turn call scripts
 * - `toolMocks`: scripted tool responses (get_balance, issue_refund, …)
 * - `callLogs`: recorded simulation runs
 */

const DB_NAME = 'cx-designer-mocks';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('personas')) {
        db.createObjectStore('personas', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('scenarios')) {
        db.createObjectStore('scenarios', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('toolMocks')) {
        db.createObjectStore('toolMocks', { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains('callLogs')) {
        db.createObjectStore('callLogs', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<any>
): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req: IDBRequest<any> = run(t.objectStore(store));
        req.onsuccess = () => {
          resolve(req.result as T);
          db.close();
        };
        req.onerror = () => {
          reject(req.error || new Error(`IDB ${mode} ${store} failed`));
          db.close();
        };
      })
  );
}

export function idbGetAll<T>(store: string): Promise<T[]> {
  return tx<T[]>(store, 'readonly', s => s.getAll());
}

export function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return tx<T | undefined>(store, 'readonly', s => s.get(key));
}

export function idbPut(store: string, value: Record<string, unknown>): Promise<void> {
  return tx<void>(store, 'readwrite', s => s.put(value)).then(() => undefined);
}

export function idbBulkPut(store: string, values: Record<string, unknown>[]): Promise<void> {
  return openDb().then(
    db =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(store, 'readwrite');
        const s = t.objectStore(store);
        for (const v of values) s.put(v);
        t.oncomplete = () => {
          resolve();
          db.close();
        };
        t.onerror = () => {
          reject(t.error || new Error(`IDB bulk put ${store} failed`));
          db.close();
        };
      })
  );
}

export function idbAdd(store: string, value: Record<string, unknown>): Promise<IDBValidKey> {
  return tx<IDBValidKey>(store, 'readwrite', s => s.add(value));
}

export function idbClear(store: string): Promise<void> {
  return tx<void>(store, 'readwrite', s => s.clear()).then(() => undefined);
}

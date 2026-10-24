export interface VaultStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  transaction(changes: Record<string, string | null>): Promise<void>;
}

export class MemoryVaultStorage implements VaultStorage {
  private data = new Map<string, string>();
  async get(key: string) { return this.data.get(key) ?? null; }
  async set(key: string, value: string) { this.data.set(key, value); }
  async transaction(changes: Record<string, string | null>) {
    const next = new Map(this.data);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key); else next.set(key, value);
    }
    this.data = next;
  }
  async dumpSerialized() { return JSON.stringify(Object.fromEntries(this.data)); }
}

export class IndexedDbVaultStorage implements VaultStorage {
  constructor(private readonly name = 'neymi-local-v1') {}
  private async database(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('records');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async get(key: string): Promise<string | null> {
    const db = await this.database();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('records', 'readonly');
        const req = tx.objectStore('records').get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } finally { db.close(); }
  }
  async set(key: string, value: string): Promise<void> { await this.transaction({[key]:value}); }
  async transaction(changes: Record<string, string | null>): Promise<void> {
    const db = await this.database();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) store.delete(key); else store.put(value, key);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  }
}

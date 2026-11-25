// =========================================================================
// LOCAL DEVICE BROWSER MEDIA STORAGE (IndexedDB)
// Stores user-uploaded gallery photos, videos, & audio directly inside the user's
// own phone/desktop browser or WebView IndexedDB — zero cloud uploads, persistent
// across sessions, and resilient against large-file QuotaExceeded crashes.
// =========================================================================

const DB_NAME = 'CineStudioLocalMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

// Files larger than 180 MB still play smoothly via in-memory object URLs during
// the session without risking mobile WebView IndexedDB quota crashes.
const MAX_PERSISTABLE_BLOB_BYTES = 180 * 1024 * 1024;
const MAX_HYDRATED_TOTAL_BYTES = 360 * 1024 * 1024;

export interface StoredLocalMediaRecord {
  id: string;
  file: Blob;
  name: string;
  mimeType: string;
  mediaType: 'video' | 'photo' | 'audio';
  duration: string;
  durationSec: number;
  thumbnailUrl?: string;
  createdAt: number;
}

export interface SaveMediaResult {
  persisted: boolean;
  reason?: 'too_large' | 'quota_exceeded' | 'unavailable';
}

function openMediaDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          try {
            db.close();
          } catch {}
        };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveLocalMediaRecord(record: StoredLocalMediaRecord): Promise<SaveMediaResult> {
  if (record.file && record.file.size > MAX_PERSISTABLE_BLOB_BYTES) {
    return { persisted: false, reason: 'too_large' };
  }

  const db = await openMediaDb();
  if (!db) return { persisted: false, reason: 'unavailable' };

  return new Promise<SaveMediaResult>((resolve) => {
    let settled = false;
    const done = (res: SaveMediaResult) => {
      if (settled) return;
      settled = true;
      try {
        db.close();
      } catch {}
      resolve(res);
    };

    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);
      tx.oncomplete = () => done({ persisted: true });
      tx.onerror = () => {
        const errName = tx.error?.name || '';
        done({
          persisted: false,
          reason: errName === 'QuotaExceededError' ? 'quota_exceeded' : 'unavailable',
        });
      };
      tx.onabort = () => {
        const errName = tx.error?.name || '';
        done({
          persisted: false,
          reason: errName === 'QuotaExceededError' ? 'quota_exceeded' : 'unavailable',
        });
      };
    } catch (err: any) {
      done({
        persisted: false,
        reason: err?.name === 'QuotaExceededError' ? 'quota_exceeded' : 'unavailable',
      });
    }
  });
}

export async function updateLocalMediaMetadata(
  id: string,
  patch: Partial<Pick<StoredLocalMediaRecord, 'duration' | 'durationSec' | 'thumbnailUrl'>>
): Promise<void> {
  const db = await openMediaDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      try {
        db.close();
      } catch {}
      resolve();
    };
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as StoredLocalMediaRecord | undefined;
        if (existing) {
          store.put({
            ...existing,
            ...patch,
          });
        }
      };
      tx.oncomplete = done;
      tx.onerror = done;
      tx.onabort = done;
    } catch {
      done();
    }
  });
}

export async function getAllLocalMediaRecords(): Promise<StoredLocalMediaRecord[]> {
  const db = await openMediaDb();
  if (!db) return [];
  return new Promise<StoredLocalMediaRecord[]>((resolve) => {
    let settled = false;
    const done = (items: StoredLocalMediaRecord[]) => {
      if (settled) return;
      settled = true;
      try {
        db.close();
      } catch {}
      resolve(items);
    };

    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const list: StoredLocalMediaRecord[] = [];
      let loadedBytes = 0;

      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          done(list);
          return;
        }
        const rec = cursor.value as StoredLocalMediaRecord | undefined;
        if (rec && rec.file) {
          const size = rec.file.size || 0;
          if (loadedBytes + size <= MAX_HYDRATED_TOTAL_BYTES) {
            list.push(rec);
            loadedBytes += size;
          }
        }
        cursor.continue();
      };
      cursorReq.onerror = () => done(list);
      tx.onabort = () => done(list);
    } catch {
      done([]);
    }
  });
}

export async function deleteLocalMediaRecord(id: string): Promise<void> {
  const db = await openMediaDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      try {
        db.close();
      } catch {}
      resolve();
    };
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = done;
      tx.onerror = done;
      tx.onabort = done;
    } catch {
      done();
    }
  });
}

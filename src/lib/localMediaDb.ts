// =========================================================================
// LOCAL DEVICE BROWSER MEDIA STORAGE (IndexedDB)
// Stores user-uploaded gallery photos & videos directly inside the user's
// own phone/desktop browser IndexedDB — zero cloud uploads, persistent across
// sessions & reloads, and handles large multi-megabyte video blobs safely!
// =========================================================================

const DB_NAME = 'CineStudioLocalMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

export interface StoredLocalMediaRecord {
  id: string;
  file: Blob;
  name: string;
  mimeType: string;
  mediaType: 'video' | 'photo';
  duration: string;
  durationSec: number;
  thumbnailUrl?: string;
  createdAt: number;
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
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveLocalMediaRecord(record: StoredLocalMediaRecord): Promise<void> {
  const db = await openMediaDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);
      tx.oncomplete = () => {
        try {
          db.close();
        } catch {}
        resolve();
      };
      tx.onerror = () => {
        try {
          db.close();
        } catch {}
        resolve();
      };
    } catch {
      resolve();
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
      tx.oncomplete = () => {
        try {
          db.close();
        } catch {}
        resolve();
      };
      tx.onerror = () => {
        try {
          db.close();
        } catch {}
        resolve();
      };
    } catch {
      resolve();
    }
  });
}

export async function getAllLocalMediaRecords(): Promise<StoredLocalMediaRecord[]> {
  const db = await openMediaDb();
  if (!db) return [];
  return new Promise<StoredLocalMediaRecord[]>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? (req.result as StoredLocalMediaRecord[]) : [];
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(list);
      };
      req.onerror = () => resolve([]);
      tx.oncomplete = () => {
        try {
          db.close();
        } catch {}
      };
    } catch {
      resolve([]);
    }
  });
}

export async function deleteLocalMediaRecord(id: string): Promise<void> {
  const db = await openMediaDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => {
        try {
          db.close();
        } catch {}
        resolve();
      };
      tx.onerror = () => {
        try {
          db.close();
        } catch {}
        resolve();
      };
    } catch {
      resolve();
    }
  });
}

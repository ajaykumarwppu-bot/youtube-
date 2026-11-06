// Creator Studio — IndexedDB layer (STATIC ENGINE)
// ---------------------------------------------------------------------------
// Pehle ye kaam Node fs karta tha (server engine). Ab browser ka IndexedDB
// hai — WebView band hone par bhi data preserve rehta hai (persistent).
//
// Design:
//   DB: "creator-studio"
//   Store "docs"  : chhote JSON documents (index, pipeline, brain, videos, settings)
//   Store "files" : package files — key = "<pkgId>/<relPath>", value = ArrayBuffer
//                   (versions snapshot: "<pkgId>/versions/v<n>/<relPath>")
//
// Sirf client code use karega (sab "use client" components ke through).

const DB_NAME = "creator-studio";
const DB_VERSION = 1;
const DOCS = "docs";
const FILES = "files";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DOCS)) db.createObjectStore(DOCS);
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        let request: IDBRequest<T> | void;
        try {
          request = run(s);
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
          return;
        }
        t.oncomplete = () => resolve(request ? (request as IDBRequest<T>).result : undefined);
        t.onerror = () => reject(t.error ?? new Error("IndexedDB transaction failed"));
        t.onabort = () => reject(t.error ?? new Error("IndexedDB transaction aborted"));
      })
  );
}

// ---------- docs ----------

export async function docGet<T>(key: string): Promise<T | null> {
  const v = await tx<T>(DOCS, "readonly", (s) => s.get(key) as IDBRequest<T>);
  return v === undefined || v === null ? null : v;
}

export async function docSet<T>(key: string, value: T): Promise<void> {
  await tx(DOCS, "readwrite", (s) => {
    s.put(value, key);
  });
}

// ---------- files ----------

export async function fileGet(pkgId: string, relPath: string): Promise<ArrayBuffer | null> {
  const key = `${pkgId}/${relPath}`;
  const v = await tx<ArrayBuffer>(FILES, "readonly", (s) => s.get(key) as IDBRequest<ArrayBuffer>);
  return v ?? null;
}

export async function filePut(pkgId: string, relPath: string, data: ArrayBuffer): Promise<void> {
  const key = `${pkgId}/${relPath}`;
  await tx(FILES, "readwrite", (s) => {
    s.put(data, key);
  });
}

export async function fileDelete(pkgId: string, relPath: string): Promise<void> {
  await tx(FILES, "readwrite", (s) => {
    s.delete(`${pkgId}/${relPath}`);
  });
}

// pkg ke saare files (relPath list) — versions/ include nahi hota jab withVersions=false
export async function fileList(pkgId: string, withVersions = false): Promise<string[]> {
  const prefix = `${pkgId}/`;
  const keys = await tx<IDBValidKey[]>(FILES, "readonly", (s) => s.getAllKeys() as IDBRequest<IDBValidKey[]>);
  const out: string[] = [];
  for (const k of keys ?? []) {
    const key = String(k);
    if (!key.startsWith(prefix)) continue;
    const rel = key.slice(prefix.length);
    if (!withVersions && rel.startsWith("versions/")) continue;
    out.push(rel);
  }
  return out;
}

// kisi prefix (pkgId ke andar) ke saare keys — tree building ke liye
export async function keysUnder(pkgId: string, subPrefix: string): Promise<string[]> {
  const full = subPrefix ? `${pkgId}/${subPrefix}` : `${pkgId}/`;
  const keys = await tx<IDBValidKey[]>(FILES, "readonly", (s) => s.getAllKeys() as IDBRequest<IDBValidKey[]>);
  const out: string[] = [];
  for (const k of keys ?? []) {
    const key = String(k);
    if (key.startsWith(full)) out.push(key.slice(`${pkgId}/`.length));
  }
  return out;
}

// poora package delete (versions samet)
export async function filesDeletePackage(pkgId: string): Promise<void> {
  const prefix = `${pkgId}/`;
  await tx(FILES, "readwrite", (s) => {
    // IDB me cursor-based range delete — prefix wale sab
    const range = IDBKeyRange.bound(prefix, prefix + "\uffff", false, false);
    const cursorReq = s.openCursor(range);
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });
}

// snapshot: current files (versions/ chhod kar) ko versions/v<n>/ ke neeche copy
export async function filesSnapshotVersion(pkgId: string, n: number): Promise<number> {
  const current = await fileList(pkgId, false);
  let moved = 0;
  for (const rel of current) {
    const data = await fileGet(pkgId, rel);
    if (data === null) continue;
    await filePut(pkgId, `versions/v${n}/${rel}`, data);
    moved++;
  }
  return moved;
}

const STORE = "source";

function openVault(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("kuanlan-shoot", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("shoot_source"));
  });
}

export async function stashShootSource(file: File): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openVault();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, "file");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("shoot_source"));
  });
  db.close();
}

export async function restoreShootSource(): Promise<File | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openVault();
  const file = await new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get("file");
    request.onsuccess = () => {
      resolve(request.result instanceof File ? request.result : null);
    };
    request.onerror = () => reject(request.error ?? new Error("shoot_source"));
  });
  db.close();
  return file;
}

export async function clearShootSource(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openVault();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete("file");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("shoot_source"));
  });
  db.close();
}

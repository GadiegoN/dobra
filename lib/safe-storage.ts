/**
 * Safe Storage Adapter with In-Memory Fallback.
 * Ensures that if the game is run in an iframe or sandbox where localStorage is disabled
 * or throws SecurityError / DOMException, the game never crashes and continues smoothly in memory.
 */

const memoryStore = new Map<string, string>();

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__dobra_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

let storageAvailable: boolean | null = null;

function checkAvailability(): boolean {
  if (storageAvailable === null) {
    storageAvailable = isStorageAvailable();
  }
  return storageAvailable;
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (checkAvailability()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // Fallback to memory if unexpected error occurs
      }
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    if (checkAvailability()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        // Fallback to memory
      }
    }
    memoryStore.set(key, value);
  },

  removeItem(key: string): void {
    if (checkAvailability()) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        // Fallback to memory
      }
    }
    memoryStore.delete(key);
  },

  clear(): void {
    if (checkAvailability()) {
      try {
        window.localStorage.clear();
        return;
      } catch {
        // Fallback to memory
      }
    }
    memoryStore.clear();
  },
};

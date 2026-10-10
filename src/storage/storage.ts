import { createSerialQueue } from '../utils/async';

const warn = (...args: unknown[]) => console.warn('[FocusKeeper]', ...args);

/** Serialises read-modify-write cycles within one JS context. */
export const withStorageLock = createSerialQueue();

/** Reads a key and repairs/validates it through `sanitize`. Never throws. */
export async function readValue<T>(key: string, sanitize: (raw: unknown) => T): Promise<T> {
  try {
    const result = await chrome.storage.local.get(key);
    return sanitize(result[key]);
  } catch (error) {
    warn(`read failed for ${key}`, error);
    return sanitize(undefined);
  }
}

export async function readMany(keys: string[]): Promise<Record<string, unknown>> {
  try {
    return await chrome.storage.local.get(keys);
  } catch (error) {
    warn('bulk read failed', error);
    return {};
  }
}

export async function readAllKeys(): Promise<string[]> {
  try {
    return Object.keys(await chrome.storage.local.get(null));
  } catch (error) {
    warn('key listing failed', error);
    return [];
  }
}

export async function writeValue(key: string, value: unknown): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [key]: value });
    return true;
  } catch (error) {
    warn(`write failed for ${key}`, error);
    return false;
  }
}

export async function removeKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await chrome.storage.local.remove(keys);
  } catch (error) {
    warn('remove failed', error);
  }
}

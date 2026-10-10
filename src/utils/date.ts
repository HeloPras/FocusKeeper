import { MS } from './time';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export const dateKey = (ts: number = Date.now()): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const isDateKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const startOfDay = (key: string): number => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime();
};

export const addDays = (key: string, delta: number): string => {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + delta, 12).getTime());
};

/** Ascending list of the last `n` dates ending at `end` (inclusive). */
export const lastNDays = (n: number, end: string = dateKey()): string[] =>
  Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));

/** Splits [start, end) at local midnights so no day is credited with another day's time. */
export function splitByDay(start: number, end: number): Array<{ date: string; ms: number }> {
  const chunks: Array<{ date: string; ms: number }> = [];
  let cursor = start;
  while (cursor < end) {
    const key = dateKey(cursor);
    const chunkEnd = Math.min(end, startOfDay(addDays(key, 1)));
    chunks.push({ date: key, ms: chunkEnd - cursor });
    cursor = chunkEnd;
  }
  return chunks;
}

export const formatDayShort = (key: string): string =>
  new Date(startOfDay(key)).toLocaleDateString(undefined, { weekday: 'short' });

export const formatDayLong = (key: string): string =>
  new Date(startOfDay(key)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const daysBetween = (a: string, b: string): number => Math.round((startOfDay(b) - startOfDay(a)) / MS.day);

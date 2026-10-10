import { STORAGE_KEYS } from '../constants';
import { addDays, dateKey, isDateKey, splitByDay } from '../utils/date';
import { asString, isRecord } from '../utils/guards';
import type { DayRecord, TimeLog } from '../types/timeLog';
import type { ThresholdEvent } from '../types/threshold';
import { readAllKeys, readMany, readValue, removeKeys, withStorageLock, writeValue } from './storage';

const keyFor = (date: string) => `${STORAGE_KEYS.dayPrefix}${date}`;

function sanitizeTimeLog(raw: unknown): TimeLog {
  const log: TimeLog = {};
  if (!isRecord(raw)) return log;
  for (const [domain, ms] of Object.entries(raw)) {
    if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) log[domain] = ms;
  }
  return log;
}

function sanitizeEvent(raw: unknown): ThresholdEvent | null {
  if (!isRecord(raw)) return null;
  const { level, usageMs, limitMs, timestamp } = raw;
  if (![level, usageMs, limitMs, timestamp].every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  const id = asString(raw.id);
  if (!id || !isDateKey(raw.date)) return null;
  return {
    id, date: raw.date, ruleId: asString(raw.ruleId), ruleLabel: asString(raw.ruleLabel),
    level: level as number, kind: (level as number) >= 100 ? 'limit' : 'warning',
    usageMs: usageMs as number, limitMs: limitMs as number, timestamp: timestamp as number
  };
}

export function sanitizeDay(date: string, raw: unknown): DayRecord {
  if (!isRecord(raw)) return { date, timeLog: {}, events: [] };
  const events = (Array.isArray(raw.events) ? raw.events : [])
    .map(sanitizeEvent)
    .filter((e): e is ThresholdEvent => e !== null);
  return { date, timeLog: sanitizeTimeLog(raw.timeLog), events };
}

export const getDay = (date: string = dateKey()): Promise<DayRecord> =>
  readValue(keyFor(date), (raw) => sanitizeDay(date, raw));

export async function getDays(dates: string[]): Promise<DayRecord[]> {
  const stored = await readMany(dates.map(keyFor));
  return dates.map((date) => sanitizeDay(date, stored[keyFor(date)]));
}

export const getTimeLog = async (date: string = dateKey()): Promise<TimeLog> => (await getDay(date)).timeLog;

const updateDay = (date: string, change: (day: DayRecord) => DayRecord): Promise<boolean> =>
  withStorageLock(async () => {
    const day = await getDay(date);
    return writeValue(keyFor(date), change(day));
  });

export const saveTimeLog = (date: string, timeLog: TimeLog): Promise<boolean> =>
  updateDay(date, (day) => ({ ...day, timeLog: sanitizeTimeLog(timeLog) }));

/** Credits [startMs, endMs) to a domain, splitting at midnight. Returns false if any write failed. */
export async function addTime(domain: string, startMs: number, endMs: number): Promise<boolean> {
  let ok = true;
  for (const chunk of splitByDay(startMs, endMs)) {
    const written = await updateDay(chunk.date, (day) => ({
      ...day,
      timeLog: { ...day.timeLog, [domain]: (day.timeLog[domain] ?? 0) + chunk.ms }
    }));
    ok = ok && written;
  }
  return ok;
}

/** Stores the event once. Resolves true only when it was new (so callers notify exactly once). */
export async function recordThresholdEvent(event: ThresholdEvent): Promise<boolean> {
  let isNew = false;
  const written = await updateDay(event.date, (day) => {
    if (day.events.some((e) => e.id === event.id)) return day;
    isNew = true;
    return { ...day, events: [...day.events, event] };
  });
  return written && isNew;
}

export async function pruneOldDays(retentionDays: number): Promise<void> {
  const cutoff = addDays(dateKey(), -retentionDays);
  const stale = (await readAllKeys()).filter(
    (k) => k.startsWith(STORAGE_KEYS.dayPrefix) && k.slice(STORAGE_KEYS.dayPrefix.length) < cutoff
  );
  await removeKeys(stale);
}

export async function clearAllDays(): Promise<void> {
  await removeKeys((await readAllKeys()).filter((k) => k.startsWith(STORAGE_KEYS.dayPrefix)));
}

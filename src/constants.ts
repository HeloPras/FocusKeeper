export const STORAGE_KEYS = {
  settings: 'fk:settings',
  todos: 'fk:todos',
  dayPrefix: 'fk:day:',
  tracker: 'fk:tracker'
} as const;

export const ALARMS = {
  heartbeat: 'fk-heartbeat',
  threshold: 'fk-threshold'
} as const;

/** Chrome >= 120 enforces a 30 s minimum alarm period in packed extensions. */
export const HEARTBEAT_PERIOD_MIN = 0.5;
/**
 * If the worker has not confirmed a session for longer than this (laptop sleep,
 * crash, missed heartbeat) the gap is NOT counted as active time.
 */
export const STALE_GRACE_MS = 75_000;
/** Alarms below this delay may be clamped by Chrome, so a best-effort timer backs them up. */
export const ALARM_MIN_DELAY_MS = 30_000;
export const THRESHOLD_SLACK_MS = 250;

export const LIMITS = {
  idleSeconds: { min: 15, max: 3600 },
  retentionDays: { min: 7, max: 365 },
  dailyLimitMin: { min: 1, max: 1440 },
  keepCompletedDays: { min: 1, max: 365 },
  todoTitleLength: 140
} as const;

export const HISTORY_DAYS = 30;
export const OTHER_CATEGORY_ID = 'other';

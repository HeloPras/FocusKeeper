export const MS = { second: 1000, minute: 60_000, hour: 3_600_000, day: 86_400_000 } as const;

export const minutesToMs = (min: number): number => min * MS.minute;

/** "2h 14m", "14m", "<1m" (and "0m" for exactly zero). */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMin = Math.floor(ms / MS.minute);
  if (totalMin < 1) return '<1m';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "12:03" or "1:02:03" for the live timer. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MS.second));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const percent = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);

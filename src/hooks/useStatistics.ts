import { useMemo } from 'react';
import { applyLive, computeDailyStatistics } from '../statistics/compute';
import type { DailyStatistics } from '../types/statistics';
import type { DayRecord } from '../types/timeLog';
import { dateKey } from '../utils/date';
import type { AppData } from './useAppData';

export interface DerivedData {
  today: string;
  liveDays: DayRecord[];
  stats: DailyStatistics[];
}

/** Merges the live segment into stored days and derives per-day statistics. */
export function useStatistics(data: AppData, now: number): DerivedData {
  const today = dateKey(now);
  return useMemo(() => {
    const liveDays = applyLive(data.days, data.tracker, now);
    const stats = liveDays.map((d) => computeDailyStatistics(d, data.settings, data.todos, today));
    return { today, liveDays, stats };
  }, [data.days, data.tracker, data.settings, data.todos, now, today]);
}

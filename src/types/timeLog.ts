import type { ThresholdEvent } from './threshold';

/** domain -> accumulated milliseconds */
export type TimeLog = Record<string, number>;

/** Everything persisted for one calendar day (local time). */
export interface DayRecord {
  date: string;
  timeLog: TimeLog;
  events: ThresholdEvent[];
}

export type ThresholdKind = 'warning' | 'limit';

export interface ThresholdEvent {
  /** `${date}:${ruleId}:${level}` - also the de-duplication key. */
  id: string;
  date: string;
  ruleId: string;
  ruleLabel: string;
  /** Percent of the limit that was crossed (e.g. 80 or 100). */
  level: number;
  kind: ThresholdKind;
  usageMs: number;
  limitMs: number;
  timestamp: number;
}

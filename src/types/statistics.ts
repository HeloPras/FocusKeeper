export interface SiteUsage {
  domain: string;
  ms: number;
  categoryId: string;
}

export interface TaskSummary {
  total: number;
  completed: number;
  incomplete: number;
  /** 0-100 */
  completionRate: number;
}

export interface DailyStatistics {
  date: string;
  totalMs: number;
  productiveMs: number;
  distractingMs: number;
  neutralMs: number;
  socialMediaMs: number;
  entertainmentMs: number;
  byCategory: Record<string, number>;
  sites: SiteUsage[];
  warningCount: number;
  limitCount: number;
  tasks: TaskSummary;
}

export interface LimitStatus {
  ruleId: string;
  label: string;
  usageMs: number;
  limitMs: number;
  ratio: number;
}

export type InsightTone = 'good' | 'warn' | 'info';

export interface Insight {
  id: string;
  tone: InsightTone;
  text: string;
}

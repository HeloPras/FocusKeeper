export type CategoryKind = 'productive' | 'distracting' | 'neutral';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  domains: string[];
  /** Daily limit in minutes, or null for no limit. */
  dailyLimitMin: number | null;
}

export interface SiteLimit {
  domain: string;
  dailyLimitMin: number;
}

export interface Settings {
  categories: Category[];
  siteLimits: SiteLimit[];
  tracking: {
    enabled: boolean;
    idleSeconds: number;
    countAudibleWhileIdle: boolean;
    retentionDays: number;
  };
  warnings: {
    enabled: boolean;
    notifications: boolean;
    /** Percent-of-limit levels. 100 is always present and means "limit reached". */
    levels: number[];
    /** Append today's open-task count to a limit/warning notification when there are any. */
    mentionOpenTasks: boolean;
  };
  todos: {
    carryOverIncomplete: boolean;
    keepCompletedDays: number;
  };
}

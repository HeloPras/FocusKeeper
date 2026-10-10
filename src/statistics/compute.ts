import { findCategory } from "../categories/categories";
import { percent } from "../utils/time";
import { dateKey } from "../utils/date";
import type { Settings } from "../types/settings";
import type { TrackerState } from "../types/session";
import type {
  DailyStatistics,
  SiteUsage,
  TaskSummary,
} from "../types/statistics";
import type { DayRecord } from "../types/timeLog";
import type { Todo } from "../types/todo";

/** Tasks that belong to `date`. Today additionally shows carried-over work when enabled. */
export function tasksForDate(
  todos: Todo[],
  date: string,
  today: string,
  carryOver: boolean,
): Todo[] {
  return todos.filter((t) => {
    if (t.date === date) return true;
    if (date !== today || !carryOver || t.date >= today) return false;
    return (
      !t.completed ||
      (t.completedAt !== null && dateKey(t.completedAt) === today)
    );
  });
}

export function summarizeTasks(tasks: Todo[]): TaskSummary {
  const completed = tasks.filter((t) => t.completed).length;
  return {
    total: tasks.length,
    completed,
    incomplete: tasks.length - completed,
    completionRate: percent(completed, tasks.length),
  };
}

/** Adds the running, not-yet-persisted segment so the UI is live between heartbeats. */
export function applyLive(
  days: DayRecord[],
  tracker: TrackerState,
  now: number,
): DayRecord[] {
  const session = tracker.session;
  if (!session) return days;
  const running = Math.max(0, now - session.segmentStart);
  const today = dateKey(now);
  return days.map((d) =>
    d.date === today
      ? {
          ...d,
          timeLog: {
            ...d.timeLog,
            [session.domain]: (d.timeLog[session.domain] ?? 0) + running,
          },
        }
      : d,
  );
}

export function computeDailyStatistics(
  day: DayRecord,
  settings: Settings,
  todos: Todo[],
  today: string,
): DailyStatistics {
  const byCategory: Record<string, number> = {};
  const sites: SiteUsage[] = [];
  let productiveMs = 0;
  let distractingMs = 0;
  let neutralMs = 0;

  for (const [domain, ms] of Object.entries(day.timeLog)) {
    const category = findCategory(domain, settings.categories);
    byCategory[category.id] = (byCategory[category.id] ?? 0) + ms;
    sites.push({ domain, ms, categoryId: category.id });
    if (category.kind === "productive") productiveMs += ms;
    else if (category.kind === "distracting") distractingMs += ms;
    else neutralMs += ms;
  }
  sites.sort((a, b) => b.ms - a.ms);

  return {
    date: day.date,
    totalMs: productiveMs + distractingMs + neutralMs,
    productiveMs,
    distractingMs,
    neutralMs,
    socialMediaMs: byCategory.social ?? 0,
    entertainmentMs: byCategory.entertainment ?? 0,
    byCategory,
    sites,
    warningCount: day.events.filter((e) => e.kind === "warning").length,
    limitCount: day.events.filter((e) => e.kind === "limit").length,
    tasks: summarizeTasks(
      tasksForDate(todos, day.date, today, settings.todos.carryOverIncomplete),
    ),
  };
}

export interface RangeSummary {
  totalMs: number;
  productiveMs: number;
  distractingMs: number;
  byCategory: Record<string, number>;
  sites: SiteUsage[];
  warningCount: number;
  limitCount: number;
  tasks: TaskSummary;
  daysWithData: number;
}

export function summarizeRange(stats: DailyStatistics[]): RangeSummary {
  const byCategory: Record<string, number> = {};
  const siteMap = new Map<string, SiteUsage>();
  let totalMs = 0,
    productiveMs = 0,
    distractingMs = 0,
    warningCount = 0,
    limitCount = 0,
    total = 0,
    completed = 0;
  for (const s of stats) {
    totalMs += s.totalMs;
    productiveMs += s.productiveMs;
    distractingMs += s.distractingMs;
    warningCount += s.warningCount;
    limitCount += s.limitCount;
    total += s.tasks.total;
    completed += s.tasks.completed;
    for (const [id, ms] of Object.entries(s.byCategory))
      byCategory[id] = (byCategory[id] ?? 0) + ms;
    for (const site of s.sites) {
      const existing = siteMap.get(site.domain);
      siteMap.set(
        site.domain,
        existing ? { ...existing, ms: existing.ms + site.ms } : { ...site },
      );
    }
  }
  return {
    totalMs,
    productiveMs,
    distractingMs,
    byCategory,
    warningCount,
    limitCount,
    sites: [...siteMap.values()].sort((a, b) => b.ms - a.ms),
    tasks: {
      total,
      completed,
      incomplete: total - completed,
      completionRate: percent(completed, total),
    },
    daysWithData: stats.filter((s) => s.totalMs > 0).length,
  };
}

/** Share of classified time that was productive; null when nothing productive/distracting was tracked. */
export function focusRatio(
  s: Pick<DailyStatistics, "productiveMs" | "distractingMs">,
): number | null {
  const denom = s.productiveMs + s.distractingMs;
  return denom > 0 ? percent(s.productiveMs, denom) : null;
}

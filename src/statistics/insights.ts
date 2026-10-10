import { formatDuration } from "../utils/time";
import type {
  DailyStatistics,
  Insight,
  LimitStatus,
} from "../types/statistics";

const ORDER = { warn: 0, good: 1, info: 2 } as const;

/** Rule-based feedback derived only from the user's own data. */
export function buildInsights(
  today: DailyStatistics,
  yesterday: DailyStatistics | undefined,
  limits: LimitStatus[],
): Insight[] {
  const out: Insight[] = [];

  for (const l of limits) {
    if (l.ratio >= 1) {
      out.push({
        id: `over:${l.ruleId}`,
        tone: "warn",
        text: `${l.label} is over its limit: ${formatDuration(l.usageMs)} of ${formatDuration(l.limitMs)}.`,
      });
    } else if (l.ratio >= 0.8) {
      out.push({
        id: `near:${l.ruleId}`,
        tone: "warn",
        text: `${l.label} is at ${Math.round(l.ratio * 100)}% of today's limit.`,
      });
    }
  }

  if (
    yesterday &&
    yesterday.distractingMs > 0 &&
    today.distractingMs > yesterday.distractingMs
  ) {
    out.push({
      id: "more-than-yesterday",
      tone: "warn",
      text: `You've already spent more time on distracting sites than all of yesterday (${formatDuration(yesterday.distractingMs)}).`,
    });
  }
  if (
    today.tasks.incomplete > 0 &&
    today.distractingMs > today.productiveMs &&
    today.distractingMs > 0
  ) {
    const n = today.tasks.incomplete;
    out.push({
      id: "tasks-vs-distraction",
      tone: "warn",
      text: `Distracting time is ahead of productive time and ${n} ${n === 1 ? "task is" : "tasks are"} still open.`,
    });
  }
  if (today.tasks.total > 0 && today.tasks.incomplete === 0) {
    out.push({
      id: "all-done",
      tone: "good",
      text: `All ${today.tasks.total} of today's tasks are done.`,
    });
  }
  if (
    yesterday &&
    today.totalMs > 0 &&
    yesterday.distractingMs > 0 &&
    today.distractingMs < yesterday.distractingMs * 0.5 &&
    today.productiveMs > 0
  ) {
    out.push({
      id: "improving",
      tone: "good",
      text: "Distracting time is running well below yesterday so far.",
    });
  }
  const topDistraction = today.sites.find(
    (s) => s.categoryId === "social" || s.categoryId === "entertainment",
  );
  if (topDistraction && out.length < 3) {
    out.push({
      id: "top-distraction",
      tone: "info",
      text: `Most time on distracting sites: ${topDistraction.domain} (${formatDuration(topDistraction.ms)}).`,
    });
  }
  if (today.totalMs === 0) {
    out.push({
      id: "empty",
      tone: "info",
      text: "Nothing tracked yet today. FocusKeeper counts only active, focused browsing time.",
    });
  }
  return out.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]).slice(0, 3);
}

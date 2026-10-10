import { findCategory, domainMatches } from '../categories/categories';
import { minutesToMs } from '../utils/time';
import type { Settings } from '../types/settings';
import type { TimeLog } from '../types/timeLog';
import type { ThresholdEvent } from '../types/threshold';
import type { LimitStatus } from '../types/statistics';

/** Pure threshold logic: no chrome.* calls, so it is trivially unit-testable. */
export interface ThresholdRule {
  id: string;
  label: string;
  limitMs: number;
  match: (domain: string) => boolean;
}

export interface LiveUsage {
  domain: string;
  /** Uncommitted milliseconds of the running segment. */
  ms: number;
}

export function buildRules(settings: Settings): ThresholdRule[] {
  const rules: ThresholdRule[] = [];
  for (const category of settings.categories) {
    if (category.dailyLimitMin && category.dailyLimitMin > 0) {
      rules.push({
        id: `cat:${category.id}`,
        label: category.name,
        limitMs: minutesToMs(category.dailyLimitMin),
        match: (domain) => findCategory(domain, settings.categories).id === category.id
      });
    }
  }
  for (const limit of settings.siteLimits) {
    rules.push({
      id: `site:${limit.domain}`,
      label: limit.domain,
      limitMs: minutesToMs(limit.dailyLimitMin),
      match: (domain) => domainMatches(domain, limit.domain)
    });
  }
  return rules;
}

/** Persisted time plus the still-uncommitted running segment. */
export function usageFor(rule: ThresholdRule, timeLog: TimeLog, live: LiveUsage | null): number {
  let total = 0;
  for (const [domain, ms] of Object.entries(timeLog)) if (rule.match(domain)) total += ms;
  if (live && rule.match(live.domain)) total += Math.max(0, live.ms);
  return total;
}

export function limitStatuses(rules: ThresholdRule[], timeLog: TimeLog, live: LiveUsage | null): LimitStatus[] {
  return rules
    .map((rule) => {
      const usageMs = usageFor(rule, timeLog, live);
      return { ruleId: rule.id, label: rule.label, usageMs, limitMs: rule.limitMs, ratio: usageMs / rule.limitMs };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export interface EvaluationInput {
  rules: ThresholdRule[];
  timeLog: TimeLog;
  live: LiveUsage | null;
  levels: number[];
  date: string;
  now: number;
  /** Ids of events already recorded today. */
  firedIds: ReadonlySet<string>;
}

export interface EvaluationResult {
  /** Newly crossed levels (may hold several per rule if usage jumped). */
  events: ThresholdEvent[];
  /** Delay until the next level is crossed by the running session, or null. */
  nextCrossingMs: number | null;
}

export const eventId = (date: string, ruleId: string, level: number) => `${date}:${ruleId}:${level}`;

export function evaluateThresholds(input: EvaluationInput): EvaluationResult {
  const { rules, timeLog, live, levels, date, now, firedIds } = input;
  const events: ThresholdEvent[] = [];
  let nextCrossingMs: number | null = null;
  const sortedLevels = [...levels].sort((a, b) => a - b);

  for (const rule of rules) {
    const usageMs = usageFor(rule, timeLog, live);
    const growing = live !== null && rule.match(live.domain);
    for (const level of sortedLevels) {
      const id = eventId(date, rule.id, level);
      if (firedIds.has(id)) continue;
      const levelMs = Math.ceil((rule.limitMs * level) / 100);
      if (usageMs >= levelMs) {
        events.push({
          id, date, ruleId: rule.id, ruleLabel: rule.label, level,
          kind: level >= 100 ? 'limit' : 'warning',
          usageMs, limitMs: rule.limitMs, timestamp: now
        });
      } else if (growing) {
        const remaining = levelMs - usageMs;
        nextCrossingMs = nextCrossingMs === null ? remaining : Math.min(nextCrossingMs, remaining);
      }
    }
  }
  return { events, nextCrossingMs };
}

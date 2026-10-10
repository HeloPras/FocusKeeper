import { getSettings } from '../storage/settingsStorage';
import { getDay, recordThresholdEvent } from '../storage/timeStorage';
import { getTodos } from '../storage/todoStorage';
import { summarizeTasks, tasksForDate } from '../statistics/compute';
import { buildRules, evaluateThresholds, type LiveUsage } from '../thresholds/rules';
import { dateKey } from '../utils/date';
import { notifyThresholdEvents } from './notifier';

/**
 * Evaluates limits against persisted time PLUS the uncommitted running segment, so a
 * crossing is detected the moment it happens, independent of any storage flush.
 * Returns how long until the running session crosses its next level (for scheduling).
 */
export async function runThresholdCheck(live: LiveUsage | null, now: number): Promise<number | null> {
  const settings = await getSettings();
  if (!settings.warnings.enabled) return null;
  const rules = buildRules(settings);
  if (rules.length === 0) return null;

  const date = dateKey(now);
  const day = await getDay(date);
  const { events, nextCrossingMs } = evaluateThresholds({
    rules,
    timeLog: day.timeLog,
    live,
    levels: settings.warnings.levels,
    date,
    now,
    firedIds: new Set(day.events.map((e) => e.id))
  });

  const fresh = [];
  for (const event of events) if (await recordThresholdEvent(event)) fresh.push(event);

  // Open tasks never gate a notification, so only read the todo list when one is actually going out.
  let openTaskCount = 0;
  if (fresh.length > 0 && settings.warnings.notifications && settings.warnings.mentionOpenTasks) {
    const todos = await getTodos();
    openTaskCount = summarizeTasks(tasksForDate(todos, date, date, settings.todos.carryOverIncomplete)).incomplete;
  }
  await notifyThresholdEvents(fresh, settings, openTaskCount);
  return nextCrossingMs;
}

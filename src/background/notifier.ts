import type { Settings } from '../types/settings';
import type { ThresholdEvent } from '../types/threshold';
import { formatDuration } from '../utils/time';
import { NOTIFICATION_ICON } from './notificationIcon';

/**
 * One notification per rule per check: if several levels were crossed at once, only the
 * highest is shown. `openTaskCount` is the number of open tasks for today (independent
 * of whether the limit itself was reached); when `mentionOpenTasks` is on and there is
 * at least one, a line is appended. Open tasks never suppress or delay a notification —
 * a limit is still a limit with an empty task list.
 */
export async function notifyThresholdEvents(events: ThresholdEvent[], settings: Settings, openTaskCount: number): Promise<void> {
  if (!settings.warnings.notifications || events.length === 0) return;
  const highest = new Map<string, ThresholdEvent>();
  for (const event of events) {
    const current = highest.get(event.ruleId);
    if (!current || event.level > current.level) highest.set(event.ruleId, event);
  }
  const taskLine =
    settings.warnings.mentionOpenTasks && openTaskCount > 0
      ? ` You still have ${openTaskCount} ${openTaskCount === 1 ? 'task' : 'tasks'} open today.`
      : '';
  for (const event of highest.values()) {
    const reached = event.kind === 'limit';
    try {
      await chrome.notifications.create(event.id, {
        type: 'basic',
        iconUrl: NOTIFICATION_ICON,
        title: reached ? `Daily limit reached: ${event.ruleLabel}` : `${event.level}% of your ${event.ruleLabel} limit`,
        message: (reached
          ? `You've used all ${formatDuration(event.limitMs)} for today. Time to switch to something else?`
          : `${formatDuration(event.usageMs)} of ${formatDuration(event.limitMs)} used today.`) + taskLine,
        priority: reached ? 2 : 1
      });
    } catch (error) {
      console.warn('[FocusKeeper] notification failed', error);
    }
  }
}

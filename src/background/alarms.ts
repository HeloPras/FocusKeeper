import {
  ALARMS,
  ALARM_MIN_DELAY_MS,
  HEARTBEAT_PERIOD_MIN,
  THRESHOLD_SLACK_MS,
} from "../constants";

let thresholdTimer: ReturnType<typeof setTimeout> | undefined;

/** Alarms outlive service-worker suspension, but must be re-created after a browser restart. */
export async function ensureHeartbeat(): Promise<void> {
  const existing = await chrome.alarms.get(ALARMS.heartbeat);
  if (!existing)
    await chrome.alarms.create(ALARMS.heartbeat, {
      periodInMinutes: HEARTBEAT_PERIOD_MIN,
    });
}

/**
 * Schedules a wake-up for the exact moment the running session crosses the next
 * threshold. The alarm is the guarantee (it wakes a suspended worker); the in-memory
 * timer adds sub-30-second precision while the worker is alive.
 */
export async function scheduleThresholdCheck(
  delayMs: number | null,
  onDue: () => void,
): Promise<void> {
  clearTimeout(thresholdTimer);
  thresholdTimer = undefined;
  await chrome.alarms.clear(ALARMS.threshold);
  if (delayMs === null) return;
  const wait = Math.max(0, delayMs) + THRESHOLD_SLACK_MS;
  await chrome.alarms.create(ALARMS.threshold, { when: Date.now() + wait });
  if (wait < ALARM_MIN_DELAY_MS) thresholdTimer = setTimeout(onDue, wait);
}

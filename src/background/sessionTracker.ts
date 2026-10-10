import { STALE_GRACE_MS } from '../constants';
import { getSettings } from '../storage/settingsStorage';
import { loadTrackerState, saveTrackerState } from '../storage/trackerStorage';
import { addTime, clearAllDays, pruneOldDays } from '../storage/timeStorage';
import type { Settings } from '../types/settings';
import type { PauseReason, Session } from '../types/session';
import { createSerialQueue } from '../utils/async';
import { dateKey } from '../utils/date';
import { scheduleThresholdCheck, ensureHeartbeat } from './alarms';
import { evaluateIdle } from './idleTracker';
import { getActiveTab, type ActiveTab } from './tabTracker';
import { runThresholdCheck } from './thresholdChecker';

export type ReconcileTrigger =
  | 'startup' | 'installed' | 'tab-activated' | 'tab-updated' | 'tab-removed'
  | 'window-focus' | 'idle' | 'heartbeat' | 'threshold' | 'settings';

/**
 * Every browser event funnels into one serialised `reconcile()`:
 *   1. ask Chrome what the user is looking at (focus, active tab, idle)
 *   2. close out the running segment up to the right moment and persist it
 *   3. start/continue a segment for the desired tab, or pause
 *   4. evaluate thresholds and schedule the next crossing
 * Because state is re-derived from ground truth each time, missed or reordered
 * events cannot cause double counting or drift.
 */
const serial = createSerialQueue();

interface Desired {
  tab: ActiveTab | null;
  pausedReason: PauseReason | null;
  rewindMs: number;
}

async function decideDesired(settings: Settings): Promise<Desired> {
  if (!settings.tracking.enabled) return { tab: null, pausedReason: 'disabled', rewindMs: 0 };
  const active = await getActiveTab();
  if (active.status !== 'ok') return { tab: null, pausedReason: active.status, rewindMs: 0 };
  const idle = await evaluateIdle(settings, active.tab.audible);
  if (idle.paused) return { tab: null, pausedReason: 'idle', rewindMs: idle.rewindMs };
  return { tab: active.tab, pausedReason: null, rewindMs: 0 };
}

/** Where the running segment ends: now, minus idle time, never past the staleness cap. */
function closingTime(session: Session, now: number, rewindMs: number): number {
  const staleCap = session.lastSeen + STALE_GRACE_MS;
  return Math.max(session.segmentStart, Math.min(now - rewindMs, staleCap));
}

async function reconcileNow(): Promise<void> {
  const now = Date.now();
  const settings = await getSettings();
  const state = await loadTrackerState();
  const desired = await decideDesired(settings);
  const prev = state.session;

  let committedMs = 0;
  let commitFailed = false;
  if (prev) {
    const end = closingTime(prev, now, desired.rewindMs);
    committedMs = end - prev.segmentStart;
    if (committedMs > 0) commitFailed = !(await addTime(prev.domain, prev.segmentStart, end));
  }

  let session: Session | null = null;
  if (desired.tab) {
    const { tab } = desired;
    if (prev && prev.tabId === tab.tabId && prev.domain === tab.domain) {
      // Same site in the same tab (including in-site navigation): keep one session.
      // If the write failed, keep the old segmentStart so the time is retried, not lost.
      session = commitFailed
        ? { ...prev, url: tab.url, lastSeen: now }
        : { ...prev, url: tab.url, accumulatedMs: prev.accumulatedMs + committedMs, segmentStart: now, lastSeen: now };
    } else {
      session = { tabId: tab.tabId, url: tab.url, domain: tab.domain, startTime: now, accumulatedMs: 0, segmentStart: now, lastSeen: now };
    }
  }

  const today = dateKey(now);
  let lastPruneDate = state.lastPruneDate;
  if (lastPruneDate !== today) {
    await pruneOldDays(settings.tracking.retentionDays);
    lastPruneDate = today;
  }
  await saveTrackerState({ session, pausedReason: desired.pausedReason, lastPruneDate });

  let nextCrossingMs: number | null = null;
  try {
    const live = session ? { domain: session.domain, ms: now - session.segmentStart } : null;
    nextCrossingMs = await runThresholdCheck(live, now);
  } catch (error) {
    console.warn('[FocusKeeper] threshold check failed', error);
  }
  await scheduleThresholdCheck(nextCrossingMs, () => void reconcile('threshold'));
}

export function reconcile(trigger: ReconcileTrigger): Promise<void> {
  return serial(async () => {
    try {
      await reconcileNow();
      if (trigger === 'startup' || trigger === 'installed') await ensureHeartbeat();
    } catch (error) {
      // A failed pass must never break future ones; the next event re-derives everything.
      console.error(`[FocusKeeper] reconcile(${trigger}) failed`, error);
    }
  });
}

/** Clears history without crediting the in-flight segment to the wiped data. */
export function resetStatistics(): Promise<void> {
  return serial(async () => {
    const state = await loadTrackerState();
    if (state.session) await saveTrackerState({ ...state, session: { ...state.session, segmentStart: Date.now(), lastSeen: Date.now() } });
    await clearAllDays();
  });
}

import { STORAGE_KEYS } from '../constants';
import { isDateKey } from '../utils/date';
import { isRecord } from '../utils/guards';
import { EMPTY_TRACKER, type PauseReason, type Session, type TrackerState } from '../types/session';

const REASONS: PauseReason[] = ['window-blurred', 'idle', 'no-valid-tab', 'disabled'];

function sanitizeSession(raw: unknown): Session | null {
  if (!isRecord(raw)) return null;
  const nums = [raw.tabId, raw.startTime, raw.accumulatedMs, raw.segmentStart, raw.lastSeen];
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  if (typeof raw.url !== 'string' || typeof raw.domain !== 'string') return null;
  return raw as unknown as Session;
}

export function sanitizeTracker(raw: unknown): TrackerState {
  if (!isRecord(raw)) return { ...EMPTY_TRACKER };
  return {
    session: sanitizeSession(raw.session),
    pausedReason: REASONS.includes(raw.pausedReason as PauseReason) ? (raw.pausedReason as PauseReason) : null,
    lastPruneDate: isDateKey(raw.lastPruneDate) ? raw.lastPruneDate : null
  };
}

/**
 * chrome.storage.session survives service-worker suspension but is wiped when the
 * browser closes, which is exactly the lifetime a "running session" should have.
 */
export async function loadTrackerState(): Promise<TrackerState> {
  try {
    const result = await chrome.storage.session.get(STORAGE_KEYS.tracker);
    return sanitizeTracker(result[STORAGE_KEYS.tracker]);
  } catch (error) {
    console.warn('[FocusKeeper] tracker state unavailable', error);
    return { ...EMPTY_TRACKER };
  }
}

export async function saveTrackerState(state: TrackerState): Promise<void> {
  try {
    await chrome.storage.session.set({ [STORAGE_KEYS.tracker]: state });
  } catch (error) {
    console.warn('[FocusKeeper] could not persist tracker state', error);
  }
}

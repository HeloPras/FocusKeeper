/** A continuous stretch of attention on one site in one tab. */
export interface Session {
  tabId: number;
  url: string;
  domain: string;
  /** When the session began (epoch ms). */
  startTime: number;
  /** Milliseconds of this session already written to the time log. */
  accumulatedMs: number;
  /** Start of the running segment that is NOT yet written to the time log. */
  segmentStart: number;
  /** Last moment the worker confirmed this session was still running. */
  lastSeen: number;
}

export type PauseReason = 'window-blurred' | 'idle' | 'no-valid-tab' | 'disabled';

/** Ephemeral tracker state, kept in chrome.storage.session so it survives worker suspension. */
export interface TrackerState {
  session: Session | null;
  pausedReason: PauseReason | null;
  lastPruneDate: string | null;
}

export const EMPTY_TRACKER: TrackerState = { session: null, pausedReason: null, lastPruneDate: null };

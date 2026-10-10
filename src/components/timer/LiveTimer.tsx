import { findCategory } from '../../categories/categories';
import { useNow } from '../../hooks/useNow';
import type { PauseReason, TrackerState } from '../../types/session';
import type { Settings } from '../../types/settings';
import { formatClock } from '../../utils/time';

const PAUSE_TEXT: Record<PauseReason, string> = {
  'window-blurred': 'Paused: the browser is in the background',
  idle: 'Paused: you have been idle',
  'no-valid-tab': 'Paused: no trackable page in focus',
  disabled: 'Tracking is turned off in Settings'
};

export function LiveTimer({ tracker, settings }: { tracker: TrackerState; settings: Settings }) {
  const now = useNow(1000);
  const { session, pausedReason } = tracker;
  if (!session) {
    return (
      <div className="live">
        <span className="dot" />
        <div className="live-text">
          <strong>{pausedReason ? PAUSE_TEXT[pausedReason] : 'Waiting for activity'}</strong>
          <span className="muted small">Time is only counted while you are active.</span>
        </div>
      </div>
    );
  }
  const elapsed = session.accumulatedMs + Math.max(0, now - session.segmentStart);
  return (
    <div className="live">
      <span className="dot on" />
      <div className="live-text">
        <strong>{session.domain}</strong>
        <span className="muted small">{findCategory(session.domain, settings.categories).name}, this visit</span>
      </div>
      <span className="clock num">{formatClock(elapsed)}</span>
    </div>
  );
}

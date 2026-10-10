import { LIMITS } from '../constants';
import type { Settings } from '../types/settings';

export function applyIdleInterval(seconds: number): void {
  const clamped = Math.min(LIMITS.idleSeconds.max, Math.max(LIMITS.idleSeconds.min, seconds));
  chrome.idle.setDetectionInterval(clamped);
}

export type IdleVerdict = { paused: false } | { paused: true; rewindMs: number };

/**
 * Decides whether idleness should pause tracking. When the state is "idle" the user
 * has already been inactive for `idleSeconds`, so that stretch is rewound and not counted.
 */
export async function evaluateIdle(settings: Settings, tabIsAudible: boolean): Promise<IdleVerdict> {
  try {
    const state = await chrome.idle.queryState(settings.tracking.idleSeconds);
    if (state === 'active') return { paused: false };
    if (state === 'idle' && settings.tracking.countAudibleWhileIdle && tabIsAudible) return { paused: false };
    return { paused: true, rewindMs: state === 'idle' ? settings.tracking.idleSeconds * 1000 : 0 };
  } catch {
    return { paused: false }; // if idle detection fails, prefer counting over silently losing data
  }
}

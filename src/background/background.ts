import { getSettings } from '../storage/settingsStorage';
import { ensureHeartbeat } from './alarms';
import { applyIdleInterval } from './idleTracker';
import { registerListeners } from './listeners';

registerListeners();

// Runs on every worker wake-up: the idle interval and alarms are not guaranteed to survive restarts.
void getSettings().then((s) => applyIdleInterval(s.tracking.idleSeconds));
void ensureHeartbeat();

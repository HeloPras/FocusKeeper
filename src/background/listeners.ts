import { STORAGE_KEYS, ALARMS } from '../constants';
import { getSettings } from '../storage/settingsStorage';
import type { RuntimeMessage, RuntimeResponse } from '../types/messages';
import { ensureHeartbeat } from './alarms';
import { applyIdleInterval } from './idleTracker';
import { reconcile, resetStatistics } from './sessionTracker';

async function prepare(): Promise<void> {
  const settings = await getSettings();
  applyIdleInterval(settings.tracking.idleSeconds);
  await ensureHeartbeat();
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn('[FocusKeeper] side panel behaviour unavailable', error);
  }
}

/** Must run synchronously at worker start-up so events wake a suspended worker. */
export function registerListeners(): void {
  chrome.runtime.onInstalled.addListener(() => void prepare().then(() => reconcile('installed')));
  chrome.runtime.onStartup.addListener(() => void prepare().then(() => reconcile('startup')));

  chrome.tabs.onActivated.addListener(() => void reconcile('tab-activated'));
  chrome.tabs.onRemoved.addListener(() => void reconcile('tab-removed'));
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (tab.active && (changeInfo.url !== undefined || changeInfo.status === 'complete' || changeInfo.audible !== undefined)) {
      void reconcile('tab-updated');
    }
  });
  chrome.windows.onFocusChanged.addListener(() => void reconcile('window-focus'));
  chrome.idle.onStateChanged.addListener(() => void reconcile('idle'));

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARMS.heartbeat) void reconcile('heartbeat');
    if (alarm.name === ALARMS.threshold) void reconcile('threshold');
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && STORAGE_KEYS.settings in changes) {
      void prepare().then(() => reconcile('settings'));
    }
  });

  chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse: (r: RuntimeResponse) => void) => {
    if (message?.type === 'RESET_STATISTICS') {
      resetStatistics().then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
      return true; // keep the channel open for the async response
    }
    return false;
  });
}

import { useEffect, useState } from 'react';
import { HISTORY_DAYS } from '../constants';
import { getSettings, createDefaultSettings } from '../storage/settingsStorage';
import { getTodos } from '../storage/todoStorage';
import { getDays } from '../storage/timeStorage';
import { loadTrackerState } from '../storage/trackerStorage';
import { EMPTY_TRACKER, type TrackerState } from '../types/session';
import type { Settings } from '../types/settings';
import type { DayRecord } from '../types/timeLog';
import type { Todo } from '../types/todo';
import { lastNDays } from '../utils/date';

export interface AppData {
  loaded: boolean;
  settings: Settings;
  todos: Todo[];
  /** Ascending, last HISTORY_DAYS days ending today. */
  days: DayRecord[];
  tracker: TrackerState;
}

/** Single subscription for the whole UI: reloads whenever any FocusKeeper key changes. */
export function useAppData(): AppData {
  const [data, setData] = useState<AppData>({
    loaded: false, settings: createDefaultSettings(), todos: [], days: [], tracker: EMPTY_TRACKER
  });

  useEffect(() => {
    let alive = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      const [settings, todos, days, tracker] = await Promise.all([
        getSettings(), getTodos(), getDays(lastNDays(HISTORY_DAYS)), loadTrackerState()
      ]);
      pending = false;
      if (alive) setData({ loaded: true, settings, todos, days, tracker });
    };
    void load();
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (Object.keys(changes).some((k) => k.startsWith('fk:'))) void load();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  return data;
}

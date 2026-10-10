import { extractDomain } from '../utils/url';

export interface ActiveTab {
  tabId: number;
  url: string;
  domain: string;
  audible: boolean;
}

export type ActiveTabResult =
  | { status: 'ok'; tab: ActiveTab }
  | { status: 'window-blurred' }
  | { status: 'no-valid-tab' };

/**
 * Asks Chrome what the user is actually looking at right now instead of trusting
 * event ordering. Every tracking decision goes through this single source of truth.
 */
export async function getActiveTab(): Promise<ActiveTabResult> {
  try {
    const win = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] });
    if (!win.focused) return { status: 'window-blurred' };
    const tab = win.tabs?.find((t) => t.active);
    if (!tab || tab.id === undefined) return { status: 'no-valid-tab' };
    const domain = extractDomain(tab.url);
    if (!domain || !tab.url) return { status: 'no-valid-tab' }; // chrome://, extension pages, invalid URLs
    return { status: 'ok', tab: { tabId: tab.id, url: tab.url, domain, audible: tab.audible === true } };
  } catch {
    // No window exists (browser closing) or the tab vanished mid-query.
    return { status: 'no-valid-tab' };
  }
}

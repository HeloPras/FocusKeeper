import { OTHER_CATEGORY_ID } from '../constants';
import type { Category } from '../types/settings';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'social',
    name: 'Social Media',
    kind: 'distracting',
    domains: ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'threads.net', 'snapchat.com'],
    dailyLimitMin: 45
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    kind: 'distracting',
    domains: ['youtube.com', 'netflix.com', 'twitch.tv', 'tiktok.com', 'reddit.com', 'primevideo.com', 'disneyplus.com'],
    dailyLimitMin: 60
  },
  {
    id: 'productivity',
    name: 'Productivity',
    kind: 'productive',
    domains: ['github.com', 'stackoverflow.com', 'notion.so', 'google.com', 'gitlab.com', 'figma.com'],
    dailyLimitMin: null
  },
  { id: OTHER_CATEGORY_ID, name: 'Other', kind: 'neutral', domains: [], dailyLimitMin: null }
];

/**
 * Colour-blind-friendly hues, defined once here but resolved through CSS custom
 * properties (see styles.css) so every chart automatically follows light/dark mode
 * without passing a theme flag around.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  social: 'var(--cat-social)',
  entertainment: 'var(--cat-entertainment)',
  productivity: 'var(--cat-productivity)',
  [OTHER_CATEGORY_ID]: 'var(--cat-other)'
};
const FALLBACK_COLORS = ['var(--cat-fallback-0)', 'var(--cat-fallback-1)', 'var(--cat-fallback-2)', 'var(--cat-fallback-3)'];

export const colorForCategory = (id: string, index = 0): string =>
  CATEGORY_COLORS[id] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? 'var(--cat-other)';

/** "docs.google.com" matches the pattern "google.com". */
export const domainMatches = (domain: string, pattern: string): boolean =>
  domain === pattern || domain.endsWith(`.${pattern}`);

/** Most specific (longest) matching pattern wins; unmatched domains fall into "Other". */
export function findCategory(domain: string, categories: Category[]): Category {
  let best: Category | undefined;
  let bestLen = -1;
  for (const category of categories) {
    for (const pattern of category.domains) {
      if (domainMatches(domain, pattern) && pattern.length > bestLen) {
        best = category;
        bestLen = pattern.length;
      }
    }
  }
  return best ?? categories.find((c) => c.id === OTHER_CATEGORY_ID) ?? DEFAULT_CATEGORIES[3]!;
}

/** Moves a domain into a category, removing it from every other one. */
export function assignDomain(categories: Category[], domain: string, categoryId: string): Category[] {
  return categories.map((c) => {
    const without = c.domains.filter((d) => d !== domain);
    return c.id === categoryId ? { ...c, domains: [...without, domain] } : { ...c, domains: without };
  });
}

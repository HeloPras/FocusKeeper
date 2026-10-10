/** Second-level public suffixes we collapse correctly (kept small on purpose; no PSL dependency). */
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'co.jp', 'ne.jp',
  'co.in', 'com.br', 'com.mx', 'com.tr', 'com.cn', 'com.sg', 'co.za', 'com.np', 'com.pk', 'com.bd'
]);

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Reduces a hostname to the logical site: www.youtube.com, m.youtube.com and
 * youtube.com all become youtube.com; bbc.co.uk stays bbc.co.uk.
 */
export function toSiteDomain(hostname: string): string | null {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (!host || host.includes(':')) return null; // empty or IPv6
  if (host === 'localhost' || IPV4.test(host)) return host;
  const labels = host.split('.');
  if (labels.length < 2 || labels.some((l) => l.length === 0)) return null;
  const lastTwo = labels.slice(-2).join('.');
  const keep = MULTI_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  return labels.slice(-keep).join('.');
}

/** Returns the site domain for trackable http(s) URLs, otherwise null. */
export function extractDomain(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return toSiteDomain(parsed.hostname);
  } catch {
    return null;
  }
}

/** Accepts "youtube.com", "www.youtube.com/watch?v=1" or a full URL typed by the user. */
export function normalizeDomainInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const domain = extractDomain(withProtocol);
  return domain && domain.includes('.') ? domain : null;
}

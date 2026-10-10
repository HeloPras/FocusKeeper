import { useState } from 'react';
import { LIMITS } from '../../constants';
import type { SiteLimit } from '../../types/settings';
import { normalizeDomainInput } from '../../utils/url';

export function SiteLimitEditor({ limits, onChange }: { limits: SiteLimit[]; onChange: (next: SiteLimit[]) => void }) {
  const [domain, setDomain] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [error, setError] = useState('');

  const add = () => {
    const normalized = normalizeDomainInput(domain);
    const value = Number(minutes);
    if (!normalized) return setError('Enter a valid website such as example.com.');
    if (!Number.isInteger(value) || value < LIMITS.dailyLimitMin.min || value > LIMITS.dailyLimitMin.max) {
      return setError(`Limit must be ${LIMITS.dailyLimitMin.min}-${LIMITS.dailyLimitMin.max} minutes.`);
    }
    if (limits.some((l) => l.domain === normalized)) return setError(`${normalized} already has a limit.`);
    setError('');
    setDomain('');
    onChange([...limits, { domain: normalized, dailyLimitMin: value }]);
  };

  return (
    <div className="form-group">
      {limits.length === 0 && <span className="muted small">No website-specific limits. Category limits still apply.</span>}
      {limits.map((l) => (
        <div className="field-row" key={l.domain}>
          <span style={{ flex: 1 }}>{l.domain}</span>
          <input className="input" style={{ width: 84 }} type="number" min={LIMITS.dailyLimitMin.min} max={LIMITS.dailyLimitMin.max} value={l.dailyLimitMin} aria-label={`Daily limit for ${l.domain} in minutes`}
            onChange={(e) => onChange(limits.map((x) => (x.domain === l.domain ? { ...x, dailyLimitMin: Number(e.target.value) } : x)))} />
          <span className="muted small">min</span>
          <button className="link-btn danger" onClick={() => onChange(limits.filter((x) => x.domain !== l.domain))}>Remove</button>
        </div>
      ))}
      <div className="field-row">
        <input className="input" value={domain} placeholder="youtube.com" aria-label="Website" onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input className="input" style={{ width: 84 }} type="number" value={minutes} aria-label="Limit in minutes" onChange={(e) => setMinutes(e.target.value)} />
        <button className="btn" onClick={add}>Add</button>
      </div>
      {error && <span className="error">{error}</span>}
    </div>
  );
}

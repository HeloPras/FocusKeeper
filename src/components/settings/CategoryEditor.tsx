import { useState } from 'react';
import { assignDomain } from '../../categories/categories';
import { LIMITS, OTHER_CATEGORY_ID } from '../../constants';
import type { Category, CategoryKind } from '../../types/settings';
import { normalizeDomainInput } from '../../utils/url';

interface Props {
  categories: Category[];
  onChange: (next: Category[]) => void;
}

const KIND_LABEL: Record<CategoryKind, string> = { productive: 'Productive', distracting: 'Distracting', neutral: 'Neutral' };

function CategoryCard({ category, categories, onChange }: { category: Category } & Props) {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');
  const patch = (p: Partial<Category>) => onChange(categories.map((c) => (c.id === category.id ? { ...c, ...p } : c)));
  const isOther = category.id === OTHER_CATEGORY_ID;

  const add = () => {
    const normalized = normalizeDomainInput(domain);
    if (!normalized) { setError('Enter a valid website such as example.com.'); return; }
    setError('');
    setDomain('');
    onChange(assignDomain(categories, normalized, category.id));
  };

  return (
    <div className="panel form-group">
      <h3>{category.name}</h3>
      <div className="field-row">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor={`kind-${category.id}`}>Counts as</label>
          <select id={`kind-${category.id}`} className="select" value={category.kind} onChange={(e) => patch({ kind: e.target.value as CategoryKind })}>
            {Object.entries(KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor={`limit-${category.id}`}>Daily limit (minutes)</label>
          <input id={`limit-${category.id}`} className="input" type="number" inputMode="numeric" min={LIMITS.dailyLimitMin.min} max={LIMITS.dailyLimitMin.max}
            placeholder="No limit" value={category.dailyLimitMin ?? ''}
            aria-invalid={category.dailyLimitMin !== null && (!Number.isInteger(category.dailyLimitMin) || category.dailyLimitMin < LIMITS.dailyLimitMin.min || category.dailyLimitMin > LIMITS.dailyLimitMin.max)}
            onChange={(e) => patch({ dailyLimitMin: e.target.value === '' ? null : Number(e.target.value) })} />
        </div>
      </div>
      {isOther ? (
        <span className="muted small">Any website that is not listed in another category.</span>
      ) : (
        <div>
          <div className="chips">
            {category.domains.length === 0 && <span className="muted small">No websites yet.</span>}
            {category.domains.map((d) => (
              <span className="chip" key={d}>{d}<button aria-label={`Remove ${d}`} onClick={() => patch({ domains: category.domains.filter((x) => x !== d) })}>×</button></span>
            ))}
          </div>
          <div className="field-row">
            <input className="input" value={domain} placeholder="Add a website, e.g. example.com" aria-label={`Add website to ${category.name}`} aria-invalid={error !== ''}
              onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            <button className="btn" onClick={add}>Add</button>
          </div>
          {error && <span className="error">{error}</span>}
        </div>
      )}
    </div>
  );
}

export function CategoryEditor({ categories, onChange }: Props) {
  return (
    <div className="form-group">
      {categories.map((c) => <CategoryCard key={c.id} category={c} categories={categories} onChange={onChange} />)}
    </div>
  );
}

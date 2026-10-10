import { useState } from 'react';
import { colorForCategory } from '../../categories/categories';
import type { AppData } from '../../hooks/useAppData';
import type { DerivedData } from '../../hooks/useStatistics';
import { focusRatio, summarizeRange } from '../../statistics/compute';
import { formatDayLong } from '../../utils/date';
import { formatDuration, percent } from '../../utils/time';
import { EmptyState } from '../common/EmptyState';
import { Ribbon } from '../common/Ribbon';
import { Section } from '../common/Section';
import { LineChart } from './LineChart';
import { StackedBars } from './StackedBars';

const RANGES = [7, 14, 30] as const;

function delta(current: number, previous: number): string {
  if (previous <= 0) return current > 0 ? 'no data the week before' : '';
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct === 0 ? 'same as the week before' : `${Math.abs(pct)}% ${pct > 0 ? 'more' : 'less'} than the week before`;
}

export function Statistics({ data, derived }: { data: AppData; derived: DerivedData }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const { settings } = data;
  const all = derived.stats;
  const shown = all.slice(-range);
  const summary = summarizeRange(shown);
  const thisWeek = summarizeRange(all.slice(-7));
  const lastWeek = summarizeRange(all.slice(-14, -7));

  const ratioValues = shown.map(focusRatio);
  const taskValues = shown.map((s) => (s.tasks.total > 0 ? s.tasks.completionRate : null));
  const enoughTrend = ratioValues.filter((v) => v !== null).length >= 2 || taskValues.filter((v) => v !== null).length >= 2;
  const days = shown.filter((s) => s.warningCount + s.limitCount > 0);

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Last {range} days</h2>
        <div className="seg" role="group" aria-label="Date range">
          {RANGES.map((r) => <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>{r}d</button>)}
        </div>
      </div>

      {summary.daysWithData === 0 ? (
        <EmptyState title="No history yet" hint="Statistics appear after FocusKeeper has tracked some browsing." />
      ) : (
        <>
          <Section title="Daily usage">
            <StackedBars days={shown} categories={settings.categories} />
            <div className="legend small">
              {settings.categories.map((c, i) => (
                <span key={c.id}><i className="swatch" style={{ background: colorForCategory(c.id, i) }} />{c.name}</span>
              ))}
            </div>
          </Section>

          <Section title="This week and last week">
            <dl className="facts">
              <div><dt>Total, this week</dt><dd>{formatDuration(thisWeek.totalMs)}</dd><span className="muted small">{delta(thisWeek.totalMs, lastWeek.totalMs)}</span></div>
              <div><dt>Distracting, this week</dt><dd>{formatDuration(thisWeek.distractingMs)}</dd><span className="muted small">{delta(thisWeek.distractingMs, lastWeek.distractingMs)}</span></div>
            </dl>
          </Section>

          <Section title="Where the time went">
            <Ribbon segments={settings.categories.map((c, i) => ({ id: c.id, label: c.name, ms: summary.byCategory[c.id] ?? 0, color: colorForCategory(c.id, i) }))} />
            <div className="rows" style={{ marginTop: 12 }}>
              {settings.categories.filter((c) => (summary.byCategory[c.id] ?? 0) > 0).map((c, i) => (
                <div className="row-head" key={c.id}>
                  <span><i className="swatch" style={{ background: colorForCategory(c.id, i), display: 'inline-block', marginRight: 8 }} />{c.name}</span>
                  <span className="muted num">{formatDuration(summary.byCategory[c.id] ?? 0)}, {percent(summary.byCategory[c.id] ?? 0, summary.totalMs)}%</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Most visited websites">
            <div className="rows">
              {summary.sites.slice(0, 8).map((s) => (
                <div key={s.domain}>
                  <div className="row-head"><span>{s.domain}</span><span className="muted num">{formatDuration(s.ms)}</span></div>
                  <div className="bar"><div className="bar-fill" style={{ width: `${(s.ms / (summary.sites[0]?.ms || 1)) * 100}%`, background: colorForCategory(s.categoryId) }} /></div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      <Section title="Productivity">
        <dl className="facts">
          <div><dt>Task completion</dt><dd>{summary.tasks.total > 0 ? `${summary.tasks.completionRate}%` : 'No tasks'}</dd></div>
          <div><dt>Completed / open</dt><dd>{summary.tasks.completed} / {summary.tasks.incomplete}</dd></div>
          <div><dt>Warnings</dt><dd>{summary.warningCount}</dd></div>
          <div><dt>Limits reached</dt><dd>{summary.limitCount}</dd></div>
        </dl>
        {enoughTrend ? (
          <div style={{ marginTop: 16 }}>
            <LineChart
              dates={shown.map((s) => s.date)}
              series={[
                { id: 'focus', label: 'Focus ratio', color: '#4f8a6b', values: ratioValues },
                { id: 'tasks', label: 'Task completion', color: '#4a86a8', values: taskValues }
              ]}
            />
            <div className="legend small">
              <span><i className="swatch" style={{ background: '#4f8a6b' }} />Focus ratio: productive share of productive + distracting time</span>
              <span><i className="swatch" style={{ background: '#4a86a8' }} />Task completion</span>
            </div>
          </div>
        ) : (
          <p className="muted small">Trend lines appear once at least two days have data.</p>
        )}
      </Section>

      {days.length > 0 && (
        <Section title="Days with alerts">
          <ul className="log-list">
            {[...days].reverse().map((s) => (
              <li key={s.date} className="log-row">
                <span className={`log-dot ${s.limitCount > 0 ? 'bad' : 'warn'}`} aria-hidden="true" />
                <span className="log-text">{s.limitCount} {s.limitCount === 1 ? 'limit' : 'limits'} reached, {s.warningCount} {s.warningCount === 1 ? 'warning' : 'warnings'}</span>
                <span className="log-time num">{formatDayLong(s.date)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

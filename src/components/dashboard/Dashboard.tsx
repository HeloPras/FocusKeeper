import { colorForCategory } from '../../categories/categories';
import type { AppData } from '../../hooks/useAppData';
import type { DerivedData } from '../../hooks/useStatistics';
import { buildInsights } from '../../statistics/insights';
import { buildRules, limitStatuses } from '../../thresholds/rules';
import { formatDuration } from '../../utils/time';
import { EmptyState } from '../common/EmptyState';
import { FocusRing } from '../common/FocusRing';
import { ProgressBar } from '../common/ProgressBar';
import { Section } from '../common/Section';
import { LiveTimer } from '../timer/LiveTimer';

export function Dashboard({ data, derived }: { data: AppData; derived: DerivedData }) {
  const { settings, tracker } = data;
  const { stats, liveDays } = derived;
  const today = stats[stats.length - 1];
  const yesterday = stats[stats.length - 2];
  const todayDay = liveDays[liveDays.length - 1];
  if (!today || !todayDay) return null;

  const limits = limitStatuses(buildRules(settings), todayDay.timeLog, null);
  const insights = buildInsights(today, yesterday, limits);
  const ticks = settings.warnings.levels.map((l) => l / 100);
  const segments = settings.categories.map((c, i) => ({
    id: c.id, label: c.name, ms: today.byCategory[c.id] ?? 0, color: colorForCategory(c.id, i)
  }));
  const topSites = today.sites.slice(0, 5);

  return (
    <div className="stack">
      <LiveTimer tracker={tracker} settings={settings} />

      <Section title="Today">
        <div className="hero">
          <FocusRing segments={segments} centerValue={formatDuration(today.totalMs)} centerLabel="tracked today" />
          <div className="legend small">
            {segments.filter((s) => s.ms > 0).map((s) => (
              <span key={s.id}><i className="swatch" style={{ background: s.color }} />{s.label} <span className="muted num">{formatDuration(s.ms)}</span></span>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Overview">
        <dl className="facts">
          <div><dt>Productive</dt><dd>{formatDuration(today.productiveMs)}</dd></div>
          <div><dt>Distracting</dt><dd>{formatDuration(today.distractingMs)}</dd></div>
          <div><dt>Social media</dt><dd>{formatDuration(today.socialMediaMs)}</dd></div>
          <div><dt>Entertainment</dt><dd>{formatDuration(today.entertainmentMs)}</dd></div>
          <div><dt>Tasks done</dt><dd>{today.tasks.completed}</dd></div>
          <div><dt>Tasks open</dt><dd>{today.tasks.incomplete}</dd></div>
        </dl>
      </Section>

      {insights.length > 0 && (
        <Section title="Feedback">
          <ul className="insights">
            {insights.map((i) => <li key={i.id} className={i.tone}>{i.text}</li>)}
          </ul>
        </Section>
      )}

      <Section title="Daily limits">
        {limits.length === 0 ? (
          <EmptyState title="No limits set" hint="Add a category or website limit in Settings to get warnings." />
        ) : (
          <div className="panel rows">
            {limits.map((l) => (
              <div key={l.ruleId}>
                <div className="row-head"><span>{l.label}</span><span className="muted num">{formatDuration(l.usageMs)} of {formatDuration(l.limitMs)}</span></div>
                <ProgressBar ratio={l.ratio} ticks={ticks} label={`${l.label} limit`} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Top websites">
        {topSites.length === 0 ? (
          <EmptyState title="No sites yet" hint="Browse normally and your most visited sites will appear here." />
        ) : (
          <div className="rows">
            {topSites.map((s) => (
              <div key={s.domain}>
                <div className="row-head"><span>{s.domain}</span><span className="muted num">{formatDuration(s.ms)}</span></div>
                <div className="bar"><div className="bar-fill" style={{ width: `${(s.ms / (topSites[0]?.ms || 1)) * 100}%`, background: colorForCategory(s.categoryId) }} /></div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {todayDay.events.length > 0 && (
        <Section title="Alerts today">
          <ul className="log-list">
            {[...todayDay.events].reverse().map((e) => (
              <li key={e.id} className="log-row">
                <span className={`log-dot ${e.kind === 'limit' ? 'bad' : 'warn'}`} aria-hidden="true" />
                <span className="log-text">{e.kind === 'limit' ? `${e.ruleLabel} limit reached` : `${e.ruleLabel} reached ${e.level}%`}</span>
                <span className="log-time num">{new Date(e.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

import { colorForCategory } from '../../categories/categories';
import type { Category } from '../../types/settings';
import type { DailyStatistics } from '../../types/statistics';
import { formatDayLong, formatDayShort } from '../../utils/date';
import { formatDuration, MS } from '../../utils/time';

const W = 320, H = 150, PAD = { l: 34, r: 4, t: 8, b: 20 };

/** Daily tracked time stacked by category. Category trends fall out of the colour bands. */
export function StackedBars({ days, categories }: { days: DailyStatistics[]; categories: Category[] }) {
  const max = Math.max(...days.map((d) => d.totalMs), 1);
  const top = Math.max(MS.hour / 2, Math.ceil(max / (MS.hour / 2)) * (MS.hour / 2));
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
  const slot = plotW / days.length;
  const barW = Math.min(28, slot * 0.68);
  const y = (ms: number) => PAD.t + plotH - (ms / top) * plotH;
  const every = days.length > 10 ? Math.ceil(days.length / 6) : 1;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily tracked time by category">
      {[0, top / 2, top].map((v) => (
        <g key={v}>
          <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
          <text x={PAD.l - 5} y={y(v) + 3} textAnchor="end">{v === 0 ? '0' : formatDuration(v)}</text>
        </g>
      ))}
      {days.map((d, i) => {
        const x = PAD.l + slot * i + (slot - barW) / 2;
        let acc = 0;
        return (
          <g key={d.date}>
            <title>{`${formatDayLong(d.date)}: ${formatDuration(d.totalMs)}`}</title>
            {categories.map((c, ci) => {
              const ms = d.byCategory[c.id] ?? 0;
              if (ms <= 0) return null;
              const rect = <rect key={c.id} x={x} width={barW} y={y(acc + ms)} height={Math.max(1, y(acc) - y(acc + ms))} fill={colorForCategory(c.id, ci)} rx={1.5} />;
              acc += ms;
              return rect;
            })}
            {i % every === 0 && <text x={x + barW / 2} y={H - 6} textAnchor="middle">{days.length <= 7 ? formatDayShort(d.date) : formatDayLong(d.date)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

import { formatDayLong } from '../../utils/date';

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  /** 0-100 per day; null where there is no data. */
  values: Array<number | null>;
}

const W = 320, H = 140, PAD = { l: 30, r: 6, t: 8, b: 20 };

export function LineChart({ dates, series }: { dates: string[]; series: LineSeries[] }) {
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (dates.length <= 1 ? plotW / 2 : (plotW * i) / (dates.length - 1));
  const y = (v: number) => PAD.t + plotH - (v / 100) * plotH;
  const every = dates.length > 10 ? Math.ceil(dates.length / 6) : 1;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => s.label).join(' and ') + ' over time'}>
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
          <text x={PAD.l - 5} y={y(v) + 3} textAnchor="end">{v}%</text>
        </g>
      ))}
      {dates.map((d, i) => i % every === 0 && <text key={d} x={x(i)} y={H - 6} textAnchor="middle">{formatDayLong(d)}</text>)}
      {series.map((s) => {
        let path = '';
        let pen = false;
        s.values.forEach((v, i) => {
          if (v === null) { pen = false; return; }
          path += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
          pen = true;
        });
        return (
          <g key={s.id}>
            <path d={path} fill="none" stroke={s.color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => v !== null && (
              <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={s.color}><title>{`${s.label}, ${formatDayLong(dates[i] ?? '')}: ${v}%`}</title></circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

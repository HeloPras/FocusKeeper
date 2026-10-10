/** ratio 1 = limit reached. `ticks` are ratios (e.g. 0.8) where warnings fire. */
export function ProgressBar({ ratio, ticks = [], label }: { ratio: number; ticks?: number[]; label: string }) {
  const tone = ratio >= 1 ? 'bad' : ratio >= 0.8 ? 'warn' : '';
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(ratio * 100))}>
      <div className={`bar-fill ${tone}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      {ticks.filter((t) => t < 1).map((t) => (
        <span key={t} className="bar-tick" style={{ left: `${t * 100}%` }} />
      ))}
    </div>
  );
}

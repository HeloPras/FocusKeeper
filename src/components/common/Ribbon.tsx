export interface RibbonSegment {
  id: string;
  label: string;
  ms: number;
  color: string;
}

/** One-line proportional breakdown; the single signature element of the dashboard. */
export function Ribbon({ segments }: { segments: RibbonSegment[] }) {
  const visible = segments.filter((s) => s.ms > 0);
  return (
    <div className="ribbon" role="img" aria-label={visible.map((s) => `${s.label} ${Math.round(s.ms / 60000)} minutes`).join(', ') || 'No data yet'}>
      {visible.map((s) => (
        <span key={s.id} style={{ flexGrow: s.ms, background: s.color }} title={s.label} />
      ))}
    </div>
  );
}

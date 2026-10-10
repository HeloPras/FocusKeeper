import { useState } from 'react';

/** Two-step destructive action so a stray click cannot wipe data. */
export function ConfirmButton({ label, confirmLabel, warning, onConfirm }: {
  label: string; confirmLabel: string; warning: string; onConfirm: () => void | Promise<void>;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return <button className="btn danger" onClick={() => setAsking(true)}>{label}</button>;
  }
  return (
    <div className="form-group">
      <span className="small muted">{warning}</span>
      <div className="field-row">
        <button className="btn danger" onClick={async () => { await onConfirm(); setAsking(false); }}>{confirmLabel}</button>
        <button className="btn" onClick={() => setAsking(false)}>Cancel</button>
      </div>
    </div>
  );
}

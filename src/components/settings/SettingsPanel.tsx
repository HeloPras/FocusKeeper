import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LIMITS } from '../../constants';
import { createDefaultSettings, saveSettings, validateSettings } from '../../storage/settingsStorage';
import type { RuntimeMessage, RuntimeResponse } from '../../types/messages';
import type { Settings } from '../../types/settings';
import { ConfirmButton } from '../common/ConfirmButton';
import { Section } from '../common/Section';
import { CategoryEditor } from './CategoryEditor';
import { SiteLimitEditor } from './SiteLimitEditor';

function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{hint && <span className="muted small" style={{ display: 'block' }}>{hint}</span>}</span>
    </label>
  );
}

function NumberField({ id, label, value, min, max, unit, onChange }: { id: string; label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }): ReactNode {
  const invalid = !Number.isInteger(value) || value < min || value > max;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-row">
        <input id={id} className="input" style={{ width: 96 }} type="number" min={min} max={max} value={Number.isNaN(value) ? '' : value} aria-invalid={invalid} onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))} />
        <span className="muted small">{unit}, {min} to {max}</span>
      </div>
    </div>
  );
}

function parseLevels(text: string): { levels: number[]; error: string | null } {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  const levels = parts.map(Number);
  if (levels.some((n) => !Number.isInteger(n) || n < 1 || n > 100)) return { levels: [], error: 'Use whole numbers from 1 to 100, separated by commas.' };
  return { levels, error: null };
}

export function SettingsPanel({ settings }: { settings: Settings }) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [levelsText, setLevelsText] = useState(settings.warnings.levels.join(', '));
  const [levelsError, setLevelsError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const stored = JSON.stringify(settings);

  useEffect(() => {
    setDraft(settings);
    setLevelsText(settings.warnings.levels.join(', '));
    setLevelsError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  const errors = useMemo(() => [...validateSettings(draft), ...(levelsError ? [levelsError] : [])], [draft, levelsError]);
  const dirty = JSON.stringify(draft) !== stored;
  const set = (patch: Partial<Settings>) => { setStatus(''); setDraft((d) => ({ ...d, ...patch })); };

  const save = async () => {
    const ok = await saveSettings(draft);
    setStatus(ok ? 'Settings saved.' : 'Could not save settings. Try again.');
  };

  const resetStatistics = async () => {
    const message: RuntimeMessage = { type: 'RESET_STATISTICS' };
    try {
      const res = (await chrome.runtime.sendMessage(message)) as RuntimeResponse | undefined;
      setStatus(res?.ok ? 'Statistics cleared.' : 'Could not clear statistics.');
    } catch {
      setStatus('Could not reach the tracker. Reload the extension and try again.');
    }
  };

  return (
    <div className="stack">
      <Section title="Tracking">
        <div className="form-group">
          <Check checked={draft.tracking.enabled} label="Track browsing time" hint="Turn off to pause all tracking." onChange={(v) => set({ tracking: { ...draft.tracking, enabled: v } })} />
          <NumberField id="idle" label="Count as idle after" unit="seconds" min={LIMITS.idleSeconds.min} max={LIMITS.idleSeconds.max} value={draft.tracking.idleSeconds} onChange={(v) => set({ tracking: { ...draft.tracking, idleSeconds: v } })} />
          <Check checked={draft.tracking.countAudibleWhileIdle} label="Keep counting while a tab is playing sound" hint="Watching a video without touching the keyboard still counts." onChange={(v) => set({ tracking: { ...draft.tracking, countAudibleWhileIdle: v } })} />
          <NumberField id="retention" label="Keep history for" unit="days" min={LIMITS.retentionDays.min} max={LIMITS.retentionDays.max} value={draft.tracking.retentionDays} onChange={(v) => set({ tracking: { ...draft.tracking, retentionDays: v } })} />
        </div>
      </Section>

      <Section title="Warnings">
        <div className="form-group">
          <Check checked={draft.warnings.enabled} label="Warn me about daily limits" onChange={(v) => set({ warnings: { ...draft.warnings, enabled: v } })} />
          <Check checked={draft.warnings.notifications} label="Show browser notifications" hint="Each warning is shown once per day." onChange={(v) => set({ warnings: { ...draft.warnings, notifications: v } })} />
          <Check checked={draft.warnings.mentionOpenTasks} label="Mention open tasks in limit notifications" hint="Adds how many tasks are still open today. Limits still notify even with no tasks." onChange={(v) => set({ warnings: { ...draft.warnings, mentionOpenTasks: v } })} />
          <div className="field">
            <label htmlFor="levels">Warn at these percentages of a limit</label>
            <input id="levels" className="input" value={levelsText} aria-invalid={levelsError !== null}
              onChange={(e) => {
                const text = e.target.value;
                setLevelsText(text);
                const parsed = parseLevels(text);
                setLevelsError(parsed.error);
                if (!parsed.error) set({ warnings: { ...draft.warnings, levels: [...new Set([...parsed.levels, 100])].sort((a, b) => a - b) } });
              }} />
            <span className="muted small">100% (limit reached) is always included.</span>
          </div>
        </div>
      </Section>

      <Section title="Category limits and websites">
        <CategoryEditor categories={draft.categories} onChange={(categories) => set({ categories })} />
      </Section>

      <Section title="Website limits">
        <SiteLimitEditor limits={draft.siteLimits} onChange={(siteLimits) => set({ siteLimits })} />
      </Section>

      <Section title="Tasks">
        <div className="form-group">
          <Check checked={draft.todos.carryOverIncomplete} label="Carry unfinished tasks over to today" hint="Otherwise only tasks planned for today count in your stats." onChange={(v) => set({ todos: { ...draft.todos, carryOverIncomplete: v } })} />
          <NumberField id="keep-done" label="Keep completed tasks for" unit="days" min={LIMITS.keepCompletedDays.min} max={LIMITS.keepCompletedDays.max} value={draft.todos.keepCompletedDays} onChange={(v) => set({ todos: { ...draft.todos, keepCompletedDays: v } })} />
        </div>
      </Section>

      <Section title="Your data">
        <div className="form-group">
          <p className="muted small" style={{ margin: 0 }}>Everything is stored on this device only. Nothing is sent anywhere.</p>
          <ConfirmButton label="Reset statistics" confirmLabel="Delete all statistics" warning="This deletes all tracked time and warnings. Your tasks and settings are kept." onConfirm={resetStatistics} />
          <ConfirmButton label="Restore default settings" confirmLabel="Restore defaults" warning="This replaces your categories, limits and preferences with the defaults." onConfirm={async () => { await saveSettings(createDefaultSettings()); setStatus('Defaults restored.'); }} />
        </div>
      </Section>

      <div className="save-bar" role="region" aria-label="Save settings">
        <div className="grow small" aria-live="polite">
          {errors.length > 0 ? <span className="error">{errors[0]}{errors.length > 1 ? ` (+${errors.length - 1} more)` : ''}</span> : <span className="muted">{status || (dirty ? 'You have unsaved changes.' : '')}</span>}
        </div>
        <button className="btn" disabled={!dirty} onClick={() => { setDraft(settings); setLevelsText(settings.warnings.levels.join(', ')); setLevelsError(null); setStatus(''); }}>Discard</button>
        <button className="btn primary" disabled={!dirty || errors.length > 0} onClick={() => void save()}>Save changes</button>
      </div>
    </div>
  );
}

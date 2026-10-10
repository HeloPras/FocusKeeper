import { useState } from 'react';
import { Dashboard } from '../../components/dashboard/Dashboard';
import { SettingsPanel } from '../../components/settings/SettingsPanel';
import { Statistics } from '../../components/statistics/Statistics';
import { TodoList } from '../../components/todos/TodoList';
import { useAppData } from '../../hooks/useAppData';
import { useNow } from '../../hooks/useNow';
import { useStatistics } from '../../hooks/useStatistics';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'todos', label: 'TODOs' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'settings', label: 'Settings' }
] as const;
type View = (typeof TABS)[number]['id'];

function LoadingSkeleton() {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      <div className="skeleton-bar" style={{ width: '40%', height: 10 }} />
      <div className="skeleton-bar" style={{ height: 150, borderRadius: 16 }} />
      <div className="skeleton-bar" style={{ width: '60%' }} />
      <div className="skeleton-bar" style={{ width: '85%' }} />
      <div className="skeleton-bar" style={{ width: '70%' }} />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const data = useAppData();
  const now = useNow(5000);
  const derived = useStatistics(data, now);

  return (
    <div className="app">
      <header className="app-head">
        <h1 className="brand">FocusKeeper</h1>
        <nav className="tabs" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} role="tab" className="tab" aria-selected={view === t.id} onClick={() => setView(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main" role="tabpanel">
        {!data.loaded ? (
          <LoadingSkeleton />
        ) : (
          <>
            {view === 'dashboard' && <Dashboard data={data} derived={derived} />}
            {view === 'todos' && <TodoList todos={data.todos} settings={data.settings} today={derived.today} />}
            {view === 'statistics' && <Statistics data={data} derived={derived} />}
            {view === 'settings' && <SettingsPanel settings={data.settings} />}
          </>
        )}
      </main>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="empty">
      <svg className="empty-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 8v4.3l2.6 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <strong>{title}</strong>
        {hint}
      </div>
    </div>
  );
}

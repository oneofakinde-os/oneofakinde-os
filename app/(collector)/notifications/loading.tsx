export default function NotificationsLoading() {
  return (
    <main className="loading-skeleton">
      <div className="loading-skeleton-header">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-subtitle" />
      </div>
      <div className="loading-skeleton-panels">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-panel">
            <div className="skeleton-list-item">
              <div className="skeleton-avatar" />
              <div className="skeleton-list-text" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function MessagesLoading() {
  return (
    <main className="loading-skeleton">
      <div className="loading-skeleton-header">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-subtitle" />
      </div>
      <div className="loading-skeleton-panels">
        {/* compose form */}
        <div className="skeleton-panel">
          <div className="skeleton-block skeleton-label" />
          <div className="skeleton-block skeleton-input" />
          <div className="skeleton-block skeleton-input" />
          <div className="skeleton-block skeleton-button" style={{ width: 120 }} />
        </div>
        {/* thread list */}
        <div className="skeleton-panel">
          <div className="skeleton-block skeleton-label" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-list-item">
              <div className="skeleton-block skeleton-avatar" />
              <div className="skeleton-list-text">
                <div className="skeleton-block skeleton-text" />
                <div className="skeleton-block skeleton-text-short" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

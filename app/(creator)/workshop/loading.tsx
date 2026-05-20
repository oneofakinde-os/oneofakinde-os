export default function WorkshopLoading() {
  return (
    <main className="loading-skeleton">
      <div className="loading-skeleton-header">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-subtitle" />
      </div>
      <div className="loading-skeleton-panels">
        {/* stats row */}
        <div className="skeleton-panel">
          <div className="skeleton-block skeleton-label" />
          <div className="skeleton-row">
            <div className="skeleton-block skeleton-stat" />
            <div className="skeleton-block skeleton-stat" />
            <div className="skeleton-block skeleton-stat" />
            <div className="skeleton-block skeleton-stat" />
          </div>
        </div>
        {/* drops list */}
        <div className="skeleton-panel">
          <div className="skeleton-block skeleton-label" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-list-item">
              <div className="skeleton-block skeleton-image" style={{ width: 64, height: 64 }} />
              <div className="skeleton-list-text">
                <div className="skeleton-block skeleton-text" />
                <div className="skeleton-block skeleton-text-short" />
              </div>
            </div>
          ))}
        </div>
        {/* worlds panel */}
        <div className="skeleton-panel">
          <div className="skeleton-block skeleton-label" />
          <div className="skeleton-row">
            <div className="skeleton-block skeleton-stat" />
            <div className="skeleton-block skeleton-stat" />
          </div>
        </div>
      </div>
    </main>
  );
}

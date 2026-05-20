export default function CollectLoading() {
  return (
    <main className="loading-skeleton">
      <div className="loading-skeleton-header">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-subtitle" />
      </div>
      <div className="loading-skeleton-panels">
        {/* lane filter tabs */}
        <div className="skeleton-panel">
          <div className="skeleton-row">
            <div className="skeleton-block skeleton-stat" />
            <div className="skeleton-block skeleton-stat" />
            <div className="skeleton-block skeleton-stat" />
          </div>
        </div>
        {/* drop cards grid */}
        <div className="loading-skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-block skeleton-image" />
              <div className="skeleton-block skeleton-text" />
              <div className="skeleton-block skeleton-text-short" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

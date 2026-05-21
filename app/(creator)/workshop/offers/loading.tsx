export default function OffersLoading() {
  return (
    <main className="loading-skeleton">
      <div className="loading-skeleton-header">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-subtitle" />
      </div>
      <div className="loading-skeleton-panels">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-panel">
            <div className="skeleton-row">
              <div className="skeleton-block skeleton-label" />
              <div className="skeleton-block skeleton-stat" />
            </div>
            <div className="skeleton-block skeleton-text" />
            <div className="skeleton-block skeleton-text-short" />
          </div>
        ))}
      </div>
    </main>
  );
}

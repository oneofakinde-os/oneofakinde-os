export default function LibraryLoading() {
  return (
    <main className="loading-skeleton">
      <div className="loading-skeleton-header">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-subtitle" />
      </div>
      <div className="loading-skeleton-panels">
        <div className="skeleton-panel">
          <div className="skeleton-row">
            <div className="skeleton-block skeleton-stat" />
            <div className="skeleton-block skeleton-label" />
          </div>
          <div className="skeleton-list-item">
            <div className="skeleton-avatar" />
            <div className="skeleton-list-text" />
          </div>
          <div className="skeleton-list-item">
            <div className="skeleton-avatar" />
            <div className="skeleton-list-text" />
          </div>
          <div className="skeleton-list-item">
            <div className="skeleton-avatar" />
            <div className="skeleton-list-text" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SetupLoading() {
  return (
    <main className="loading-skeleton">
      <div className="loading-skeleton-header">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-subtitle" />
      </div>
      <div className="skeleton-form">
        <div className="skeleton-block skeleton-input" />
        <div className="skeleton-block skeleton-input" />
        <div className="skeleton-block skeleton-input" />
        <div className="skeleton-block skeleton-button" />
      </div>
    </main>
  );
}

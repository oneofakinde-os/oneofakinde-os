"use client";

export default function CollectorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-boundary">
      <div className="error-boundary-card">
        <h2 className="error-boundary-title">collection error</h2>
        <p className="error-boundary-message">
          we hit a snag loading your collection. this has been logged.
        </p>
        {error.digest && (
          <p className="error-boundary-digest">ref: {error.digest}</p>
        )}
        <button className="error-boundary-retry" onClick={reset}>
          try again
        </button>
      </div>
    </main>
  );
}

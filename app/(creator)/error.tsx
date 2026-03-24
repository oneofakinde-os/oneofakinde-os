"use client";

export default function CreatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-boundary">
      <div className="error-boundary-card">
        <h2 className="error-boundary-title">workshop error</h2>
        <p className="error-boundary-message">
          something went wrong in the workshop. this has been logged.
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

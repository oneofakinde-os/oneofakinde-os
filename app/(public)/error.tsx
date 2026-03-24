"use client";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-boundary">
      <div className="error-boundary-card">
        <h2 className="error-boundary-title">page error</h2>
        <p className="error-boundary-message">
          something went wrong loading this page. please try again.
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

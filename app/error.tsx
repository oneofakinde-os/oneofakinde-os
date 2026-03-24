"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-boundary">
      <div className="error-boundary-card">
        <h2 className="error-boundary-title">something went wrong</h2>
        <p className="error-boundary-message">
          an unexpected error occurred. please try again.
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

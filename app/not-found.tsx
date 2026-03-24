import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-boundary">
      <div className="error-boundary-card">
        <h2 className="error-boundary-title">not found</h2>
        <p className="error-boundary-message">
          the page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/showroom" className="error-boundary-retry">
          back to showroom
        </Link>
      </div>
    </main>
  );
}

// Simple 404 page for Next.js (App Router)
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-[var(--neutral-12)]">
      <div className="text-center space-y-3">
        <p className="text-sm uppercase tracking-wide text-[var(--neutral-9)]">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-[var(--neutral-10)]">
          The page you are looking for doesn&apos;t exist or was moved.
        </p>
      </div>
    </main>
  );
}

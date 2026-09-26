import Link from "next/link";

/** Lightweight not-found without i18n (avoids prerender workStore issues). */
export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-neutral-12">404</h1>
      <p className="text-sm text-neutral-11">Tool or page not found.</p>
      <Link
        href="/"
        className="rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to tools
      </Link>
    </div>
  );
}

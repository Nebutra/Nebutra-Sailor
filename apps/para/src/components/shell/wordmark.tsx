import Link from "next/link";

/**
 * The PARA lockup. A wordmark is a logo, not type in the system, so it is the one place letter
 * spacing is set by hand — through `tracking-wordmark` rather than an arbitrary value, and from
 * here rather than from each header that happens to render it.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="PARA home"
      className={`font-medium text-body text-foreground tracking-wordmark ${className ?? ""}`}
    >
      PARA
    </Link>
  );
}

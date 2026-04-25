import { cn } from "@nebutra/ui/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuthBanner } from "./auth-banner";

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthSplitLayout({ children, className }: AuthSplitLayoutProps) {
  return (
    <div
      className={cn(
        "grid min-h-screen bg-[var(--neutral-1)] lg:grid-cols-[minmax(360px,36vw)_1fr]",
        className,
      )}
    >
      <AuthBanner />
      <main
        id="main-content"
        className="relative flex min-h-[100svh] flex-col items-center justify-center px-5 py-20 sm:px-8 lg:px-16"
      >
        <Link
          href="/"
          className="absolute left-5 top-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--neutral-10)] transition-colors hover:text-[var(--neutral-12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--blue-9)] sm:left-8 lg:left-12 lg:top-10"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Home
        </Link>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--neutral-2)_80%,transparent),transparent)] lg:hidden"
        />
        <div className="relative w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}

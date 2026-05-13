"use client";

import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: (Error & { digest?: string }) | null;
}

/**
 * Root client error boundary used inside [locale]/layout.tsx.
 *
 * Rendered when a descendant client component throws. Uses 2026 visual language
 * (font-semibold, hairline ring, ink CTA, aurora backdrop) rather than the
 * default React boilerplate. Stays in English — translations may not be loaded
 * when this fires.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error & { digest?: string }): State {
    return { hasError: true, error };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Sentry / PostHog capture is handled in global-error.tsx for unhandled
    // server errors. Client errors caught here can be added later if needed.
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const digest = this.state.error?.digest;

    return (
      <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
        {/* Subtle aurora — inlined because this is a client class component */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          style={{
            backgroundImage: `
              radial-gradient(at 27% 37%, var(--blue-9) 0px, transparent 50%),
              radial-gradient(at 73% 63%, var(--cyan-9) 0px, transparent 50%)
            `,
            filter: "blur(80px) saturate(1.2)",
            opacity: 0.35,
          }}
        />

        <main role="alert" className="relative w-full max-w-md">
          <div
            className="rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-[var(--neutral-1)]/85 p-8 backdrop-blur-xl"
            style={{ boxShadow: "var(--ring-hairline)" }}
          >
            <div className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.08em] text-[var(--neutral-11)]">
              Error 500
              {digest ? ` · ${digest.slice(0, 8)}` : ""}
            </div>

            <h1
              className="mb-3 text-2xl font-semibold text-[var(--neutral-12)]"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              Something went wrong
            </h1>

            <p className="mb-7 text-sm leading-relaxed text-[var(--neutral-11)]">
              An unexpected error occurred. You can try again — if the problem persists, check the
              status page or contact support.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button variant="ink" size="default" onClick={this.reset}>
                Try again
              </Button>
              <Button asChild variant="outline" size="default">
                <Link href="/">Go home</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--neutral-6)] pt-4 font-mono text-xs text-[var(--neutral-11)]">
              <a
                href="https://status.nebutra.com"
                className="inline-flex items-center gap-1 transition-opacity hover:opacity-80"
                rel="noreferrer"
              >
                status.nebutra.com
                <span aria-hidden="true">→</span>
              </a>
              {digest ? (
                <span className="select-all opacity-70" title="Send this ID to support">
                  {digest}
                </span>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    );
  }
}

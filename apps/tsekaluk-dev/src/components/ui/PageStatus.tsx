"use client";

import { AnimateIn } from "@nebutra/ui/components";
import NextLink from "next/link";
import type { ComponentType, ReactNode } from "react";

type LinkLike = ComponentType<{
  href: string;
  className?: string;
  children?: ReactNode;
}>;

interface BaseProps {
  label: string;
  message: string;
  showIcon?: boolean;
  homeHref?: string;
}

interface ErrorVariantProps extends BaseProps {
  kind: "error";
  reset: () => void;
  /** Pass `@/i18n/navigation`'s Link to preserve locale; omit for raw `next/link`. */
  LocaleLink?: LinkLike;
}

interface NotFoundVariantProps extends BaseProps {
  kind: "not-found";
  LocaleLink?: LinkLike;
}

type PageStatusProps = ErrorVariantProps | NotFoundVariantProps;

/**
 * Editorial full-page status — preserves tsekaluk-dev's serif-italic personal-site
 * aesthetic. Distinct from Nebutra SaaS @nebutra/ui's FullPageStatus.
 *
 * Used by: app/error.tsx · app/[locale]/error.tsx · app/[locale]/not-found.tsx ·
 * app/[locale]/(main)/*‍/error.tsx.
 */
export function PageStatus(props: PageStatusProps) {
  const { label, message, showIcon = false, homeHref = "/" } = props;
  const Link: LinkLike = props.LocaleLink ?? (NextLink as unknown as LinkLike);

  return (
    <section className="mx-auto grid min-h-[100dvh] max-w-3xl place-items-center px-6 py-32 text-center">
      <AnimateIn preset="fade">
        {showIcon && <PulsingIcon />}
        <p className="font-serif italic text-8xl text-gray-200 dark:text-gray-800">{label}</p>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">{message}</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          {props.kind === "error" && (
            <button
              type="button"
              onClick={props.reset}
              className="inline-block rounded-full border border-gray-300 dark:border-gray-700 px-6 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
            >
              Try again
            </button>
          )}
          <HomeLink Link={Link} href={homeHref}>
            Go home
          </HomeLink>
        </div>
      </AnimateIn>
    </section>
  );
}

function HomeLink({ Link, href, children }: { Link: LinkLike; href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-block rounded-full bg-gray-900 dark:bg-white px-6 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
    >
      {children}
    </Link>
  );
}

function PulsingIcon() {
  return (
    <>
      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: keyframes injection scoped to component
        dangerouslySetInnerHTML={{
          __html: `@keyframes pulse-gentle { 0%,100% { opacity: 0.4; } 50% { opacity: 0.2; } }`,
        }}
      />
      <div
        className="w-16 h-16 mx-auto mb-4"
        style={{ animation: "pulse-gentle 3s ease-in-out infinite" }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full text-gray-300 dark:text-gray-700"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <circle cx="12" cy="16" r="0.5" fill="currentColor" />
        </svg>
      </div>
    </>
  );
}

/**
 * Storybook stub for `next/link`.
 *
 * `next/link` references `process.env.NODE_ENV` at module init, which Next.js's
 * own bundler replaces but Vite (used by @storybook/react-vite) does not. The
 * resulting `ReferenceError: process is not defined` blocks any Storybook story
 * that transitively imports from `apps/web`.
 *
 * This stub strips Next-specific props and renders a plain anchor — sufficient
 * for visual / interaction stories. For production behavior, run the actual app.
 *
 * See: docs/architecture/2026-05-14-storybook-perf-governance.md
 */

import { type AnchorHTMLAttributes, forwardRef, type ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | URL;
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
  locale?: string | false;
  as?: string;
  children?: ReactNode;
};

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function NextLinkStub(
  {
    href,
    // Strip Next-only props to avoid React warnings about unknown <a> attributes
    prefetch: _prefetch,
    replace: _replace,
    scroll: _scroll,
    shallow: _shallow,
    passHref: _passHref,
    legacyBehavior: _legacyBehavior,
    locale: _locale,
    as: _as,
    children,
    ...rest
  },
  ref,
) {
  const hrefStr = typeof href === "string" ? href : href.toString();
  return (
    <a ref={ref} href={hrefStr} {...rest}>
      {children}
    </a>
  );
});

export default Link;

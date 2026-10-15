import { Logo, Logomark } from "@nebutra/brand";

/**
 * The official marks in both editions, one shown per theme by CSS — no flash
 * before hydration, no theme read in render. Reversed on dark, standard on light.
 * The theme class sits on a wrapper: the marks set an inline `display`, which
 * would beat a `hidden` class on the mark itself and show both editions.
 */
export function ThemedLogo({ size }: { size: number }) {
  return (
    <>
      <span className="hidden dark:contents">
        <Logo variant="en" size={size} inverted />
      </span>
      <span className="contents dark:hidden">
        <Logo variant="en" size={size} />
      </span>
    </>
  );
}

export function ThemedLogomark({ size }: { size: number }) {
  return (
    <>
      <span className="hidden dark:contents">
        <Logomark variant="mono" size={size} inverted />
      </span>
      <span className="contents dark:hidden">
        <Logomark variant="mono" size={size} />
      </span>
    </>
  );
}

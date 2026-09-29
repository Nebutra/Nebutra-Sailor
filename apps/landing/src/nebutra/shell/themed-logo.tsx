import { Logo, Logomark } from "@nebutra/brand";

/**
 * The official marks in both editions, one shown per theme by CSS — no flash
 * before hydration, no theme read in render. Reversed on dark, standard on light.
 */
export function ThemedLogo({ size }: { size: number }) {
  return (
    <>
      <Logo variant="en" size={size} inverted className="hidden dark:block" />
      <Logo variant="en" size={size} className="dark:hidden" />
    </>
  );
}

export function ThemedLogomark({ size }: { size: number }) {
  return (
    <>
      <Logomark variant="mono" size={size} inverted className="hidden dark:block" />
      <Logomark variant="mono" size={size} className="dark:hidden" />
    </>
  );
}

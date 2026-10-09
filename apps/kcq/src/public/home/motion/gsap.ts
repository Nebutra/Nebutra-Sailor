/**
 * GSAP for /home, loaded lazily so it never sits on the first-paint path. It owns exactly two
 * things (founder motion spec 2026-10-09): the hero timeline and the pinned agent story. Everything
 * else is CSS/WAAPI. One owner per element and property: GSAP never animates a property a CSS
 * transition also animates on the same element.
 *
 * Eases approximate the motion tokens: `power4.out` ≈ --klc-motion-ease-out
 * cubic-bezier(0.23, 1, 0.32, 1).
 */
export const EASE_OUT = "power4.out";

/** Motion is allowed; every GSAP context is created under this query and reverts when it flips. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

let loading: Promise<typeof import("gsap")["gsap"]> | undefined;
export function loadGsap() {
  loading ??= import("gsap").then((module) => module.gsap);
  return loading;
}

export async function loadScrollTrigger() {
  const [gsap, { ScrollTrigger }] = await Promise.all([loadGsap(), import("gsap/ScrollTrigger")]);
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}

/**
 * @nebutra/onboarding — multi-step product tours for SaaS surfaces.
 *
 * Built on top of `driver.js` (lightweight, framework-agnostic, ~5KB gzip)
 * with a thin React context for state + localStorage persistence + token-
 * themed CSS overrides.
 *
 * Usage:
 *
 *   // 1. Import styles once (e.g. in apps/web/src/app/globals.css):
 *   //    @import "@nebutra/onboarding/styles.css";
 *
 *   // 2. Wrap your app:
 *   import { OnboardingProvider } from "@nebutra/onboarding";
 *   <OnboardingProvider>{children}</OnboardingProvider>
 *
 *   // 3. Define a tour:
 *   const DASHBOARD_TOUR: Tour = {
 *     id: "dashboard.v1",
 *     label: "Dashboard quickstart",
 *     steps: [
 *       {
 *         id: "command",
 *         target: '[data-tour-id="command-surface"]',
 *         title: "Your command center",
 *         description: "Press ⌘K from anywhere to run any action.",
 *       },
 *     ],
 *   };
 *
 *   // 4. Trigger from any client component:
 *   const tour = useTour();
 *   tour.start(DASHBOARD_TOUR);
 *   tour.isCompleted("dashboard.v1");  // true after user clicks Done
 *
 * Anchor your steps via `data-tour-id="..."` attributes on the UI elements
 * rather than class names — refactors won't silently break the tour.
 */

export { OnboardingProvider, useTour } from "./provider";
export type { Tour, TourAlign, TourController, TourSide, TourState, TourStep } from "./types";

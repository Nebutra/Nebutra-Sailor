import type { Tour } from "@nebutra/onboarding";

/**
 * Dashboard quickstart tour — 4 steps walking through the core surfaces.
 *
 * Targets use `data-tour-id="..."` attributes set on the components themselves
 * so the tour survives className refactors. Versioned id (`v1`) so we can
 * publish a new tour and reset everyone without colliding with completion
 * state for the old tour.
 */
export const DASHBOARD_TOUR_V1: Tour = {
  id: "dashboard.v1",
  label: "Dashboard quickstart",
  steps: [
    {
      id: "command",
      target: '[data-tour-id="command-surface"]',
      title: "Your command center",
      description:
        "Press ⌘K from anywhere to run any command. The big bar is the same thing — click it to open the palette.",
      side: "bottom",
    },
    {
      id: "modes",
      target: '[data-tour-id="mode-pills"]',
      title: "Pick a mode",
      description:
        "Each mode routes you to a different surface — Data goes to analytics, Workflow to integrations, Search opens the palette.",
      side: "bottom",
    },
    {
      id: "plan-badge",
      target: '[data-tour-id="plan-badge"]',
      title: "Your plan, at a glance",
      description: "Current plan and usage live in the header. Click to manage billing or upgrade.",
      side: "bottom",
      align: "end",
    },
    {
      id: "getting-started",
      target: '[data-tour-id="getting-started"]',
      title: "Finish setup",
      description:
        "These tasks unlock the full workspace. Each one links to its setup page — Sailor tracks completion automatically.",
      side: "top",
    },
  ],
  doneLabel: "Get started",
};

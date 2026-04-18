import { describe, expect, it } from "vitest";

import {
  CheckoutEvent,
  DocsSearchEvent,
  EVENT_SCHEMAS,
  LicenseCliEvent,
  LicenseWizardEvent,
  ScaffoldCompletedEvent,
  SleptonsEvent,
} from "../events";

describe("Event contracts", () => {
  it("ScaffoldCompletedEvent accepts a valid payload", () => {
    const payload = {
      template_version: "1.3.1",
      package_manager: "pnpm" as const,
      region: "global" as const,
      auth: "clerk",
      payment: "stripe",
      ai_providers: ["openai", "anthropic"],
      deploy_target: "vercel",
      duration_ms: 12400,
    };
    expect(() => ScaffoldCompletedEvent.parse(payload)).not.toThrow();
  });

  it("ScaffoldCompletedEvent rejects wrong enum (package_manager)", () => {
    const bad = {
      template_version: "1",
      package_manager: "invalid",
      region: "global",
      auth: "x",
      payment: "x",
      ai_providers: [],
      deploy_target: "x",
      duration_ms: 1,
    };
    expect(() => ScaffoldCompletedEvent.parse(bad)).toThrow();
  });

  it("ScaffoldCompletedEvent rejects wrong enum (region)", () => {
    const bad = {
      template_version: "1",
      package_manager: "pnpm",
      region: "moon",
      auth: "x",
      payment: "x",
      ai_providers: [],
      deploy_target: "x",
      duration_ms: 1,
    };
    expect(() => ScaffoldCompletedEvent.parse(bad)).toThrow();
  });

  it("LicenseWizardEvent accepts started step with no tier", () => {
    expect(() => LicenseWizardEvent.parse({ step: "started" })).not.toThrow();
  });

  it("LicenseWizardEvent rejects unknown tier", () => {
    expect(() =>
      LicenseWizardEvent.parse({ step: "submitted", tier: "FREE" }),
    ).toThrow();
  });

  it("LicenseCliEvent requires cli_version", () => {
    expect(() =>
      LicenseCliEvent.parse({ action: "activate_attempted" }),
    ).toThrow();
    expect(() =>
      LicenseCliEvent.parse({ action: "activate_attempted", cli_version: "0.2.0" }),
    ).not.toThrow();
  });

  it("SleptonsEvent restricts action to known values", () => {
    expect(() =>
      SleptonsEvent.parse({ action: "profile_viewed" }),
    ).not.toThrow();
    expect(() => SleptonsEvent.parse({ action: "delete_account" })).toThrow();
  });

  it("DocsSearchEvent requires query and result_count", () => {
    expect(() =>
      DocsSearchEvent.parse({ query: "rbac", result_count: 4 }),
    ).not.toThrow();
    expect(() => DocsSearchEvent.parse({ query: "rbac" })).toThrow();
  });

  it("CheckoutEvent accepts optional amount/currency", () => {
    expect(() =>
      CheckoutEvent.parse({
        action: "completed",
        tier: "STARTUP",
        amount_cents: 4900,
        currency: "USD",
        payment_method: "stripe",
      }),
    ).not.toThrow();
    expect(() =>
      CheckoutEvent.parse({ action: "started", tier: "STARTUP" }),
    ).not.toThrow();
  });

  it("EVENT_SCHEMAS has all 6 event contracts defined", () => {
    expect(Object.keys(EVENT_SCHEMAS)).toHaveLength(6);
    expect(EVENT_SCHEMAS["scaffold.completed"]).toBeDefined();
    expect(EVENT_SCHEMAS["license.wizard"]).toBeDefined();
    expect(EVENT_SCHEMAS["license.cli"]).toBeDefined();
    expect(EVENT_SCHEMAS.sleptons).toBeDefined();
    expect(EVENT_SCHEMAS["docs.search_query"]).toBeDefined();
    expect(EVENT_SCHEMAS.checkout).toBeDefined();
  });

  it("BaseEventProps fields are optional across all schemas", () => {
    // Every schema should accept its minimal payload WITHOUT any BaseEventProps fields
    expect(() =>
      ScaffoldCompletedEvent.parse({
        template_version: "1",
        package_manager: "npm",
        region: "cn",
        auth: "x",
        payment: "x",
        ai_providers: [],
        deploy_target: "x",
        duration_ms: 1,
      }),
    ).not.toThrow();
    expect(() => LicenseWizardEvent.parse({ step: "started" })).not.toThrow();
    expect(() =>
      LicenseCliEvent.parse({ action: "activated", cli_version: "1.0.0" }),
    ).not.toThrow();
    expect(() =>
      SleptonsEvent.parse({ action: "showcase_posted" }),
    ).not.toThrow();
    expect(() =>
      DocsSearchEvent.parse({ query: "q", result_count: 0 }),
    ).not.toThrow();
    expect(() =>
      CheckoutEvent.parse({ action: "abandoned", tier: "OPC" }),
    ).not.toThrow();
  });
});

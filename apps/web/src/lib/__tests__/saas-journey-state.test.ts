import { describe, expect, it } from "vitest";
import { resolveBillingJourneyNotice } from "@/app/[locale]/(app)/billing/journey-state";
import { resolveSelectOrgJourneyCopy } from "@/app/[locale]/select-org/journey-state";

describe("resolveBillingJourneyNotice", () => {
  it("surfaces a checkout success return with concrete next steps", () => {
    expect(
      resolveBillingJourneyNotice({
        status: "success",
        session_id: "cs_test_123",
      }),
    ).toMatchObject({
      tone: "success",
      title: "Checkout complete",
      primaryAction: { href: "./settings/team", label: "Invite your team" },
      secondaryAction: { href: "./usage", label: "Review usage" },
    });
  });

  it("surfaces a canceled checkout as recoverable instead of silently returning to billing", () => {
    expect(resolveBillingJourneyNotice({ canceled: "true" })).toMatchObject({
      tone: "warning",
      title: "Checkout canceled",
      primaryAction: { href: "./billing", label: "Choose a plan" },
    });
  });
});

describe("resolveSelectOrgJourneyCopy", () => {
  it("keeps invitation acceptance visible while the organization list loads", () => {
    expect(resolveSelectOrgJourneyCopy({ invitation: "accepted" })).toMatchObject({
      title: "Invitation accepted",
      description:
        "Select the workspace you were invited to, or create a new one if it is not listed yet.",
      emptyTitle: "No invited workspace yet",
      emptyActionLabel: "Create a workspace instead",
    });
  });

  it("nudges users back into workspace selection after billing redirects without an active org", () => {
    expect(resolveSelectOrgJourneyCopy({ from: "billing" })).toMatchObject({
      title: "Choose a workspace for billing",
      emptyDescription:
        "Billing actions need an active workspace. Create one first, then return to billing.",
      emptyActionHref: "/onboarding?next=/billing",
    });
  });
});

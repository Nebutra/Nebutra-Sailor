export type SelectOrgSearchParams = Record<string, string | string[] | undefined>;

/**
 * Discriminant that identifies which journey variant the select-org page is in.
 * Consumers (e.g. select-org-client.tsx) use this to look up the correct
 * translated empty-state copy from the `selectOrg` i18n namespace.
 */
export type SelectOrgJourneyVariant = "invitation" | "billing" | "default";

export interface SelectOrgJourneyCopy {
  /** i18n variant key — used by the client to resolve translated empty-state strings. */
  variant: SelectOrgJourneyVariant;
  title: string;
  description: string;
  emptyActionHref: string;
  emptyActionLabel: string;
  createActionLabel: string;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveSelectOrgJourneyCopy(params: SelectOrgSearchParams): SelectOrgJourneyCopy {
  if (firstValue(params.invitation) === "accepted" || firstValue(params.invite) === "accepted") {
    return {
      variant: "invitation",
      title: "Invitation accepted",
      description:
        "Select the workspace you were invited to, or create a new one if it is not listed yet.",
      emptyActionHref: "/onboarding",
      emptyActionLabel: "Create a workspace instead",
      createActionLabel: "Create another workspace",
    };
  }

  if (firstValue(params.from) === "billing") {
    return {
      variant: "billing",
      title: "Choose a workspace for billing",
      description:
        "Billing changes are scoped to a workspace. Select one to continue managing the subscription.",
      emptyActionHref: "/onboarding?next=/billing",
      emptyActionLabel: "Create workspace",
      createActionLabel: "Create new workspace",
    };
  }

  return {
    variant: "default",
    title: "Select a workspace",
    description: "Choose a workspace to continue, or create a new one.",
    emptyActionHref: "/onboarding",
    emptyActionLabel: "Create workspace",
    createActionLabel: "Create new workspace",
  };
}

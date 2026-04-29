export type SelectOrgSearchParams = Record<string, string | string[] | undefined>;

export interface SelectOrgJourneyCopy {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
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
      title: "Invitation accepted",
      description:
        "Select the workspace you were invited to, or create a new one if it is not listed yet.",
      emptyTitle: "No invited workspace yet",
      emptyDescription:
        "The invitation may still be syncing. You can refresh this page or create a separate workspace.",
      emptyActionHref: "/onboarding",
      emptyActionLabel: "Create a workspace instead",
      createActionLabel: "Create another workspace",
    };
  }

  if (firstValue(params.from) === "billing") {
    return {
      title: "Choose a workspace for billing",
      description:
        "Billing changes are scoped to a workspace. Select one to continue managing the subscription.",
      emptyTitle: "Create a workspace before billing",
      emptyDescription:
        "Billing actions need an active workspace. Create one first, then return to billing.",
      emptyActionHref: "/onboarding?next=/billing",
      emptyActionLabel: "Create workspace",
      createActionLabel: "Create new workspace",
    };
  }

  return {
    title: "Select a workspace",
    description: "Choose a workspace to continue, or create a new one.",
    emptyTitle: "No workspaces yet",
    emptyDescription: "No workspaces yet. Create one to get started.",
    emptyActionHref: "/onboarding",
    emptyActionLabel: "Create workspace",
    createActionLabel: "Create new workspace",
  };
}

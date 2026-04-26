import type { NextResponse } from "next/server";

export const ACTIVE_ORG_COOKIE = "nebutra_active_org";
export const ACTIVE_ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export interface OrganizationSelectionCandidate {
  id: string;
}

interface ResolveActiveOrganizationInput {
  sessionOrganizationId?: string | null;
  cookieOrganizationId?: string | null;
  organizations: ReadonlyArray<OrganizationSelectionCandidate>;
}

export function resolveActiveOrganizationSelection({
  sessionOrganizationId,
  cookieOrganizationId,
  organizations,
}: ResolveActiveOrganizationInput): string | null {
  if (sessionOrganizationId) {
    return sessionOrganizationId;
  }

  if (cookieOrganizationId) {
    const selectedOrganization = organizations.find(
      (organization) => organization.id === cookieOrganizationId,
    );

    if (selectedOrganization) {
      return selectedOrganization.id;
    }
  }

  if (organizations.length === 1) {
    return organizations[0]?.id ?? null;
  }

  return null;
}

export function setActiveOrganizationCookie(response: NextResponse, organizationId: string): void {
  response.cookies.set({
    name: ACTIVE_ORG_COOKIE,
    value: organizationId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
  });
}

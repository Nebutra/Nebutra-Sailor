/**
 * /settings/organization/members — phase 2.5.
 *
 * Gated by `isAuthFeatureEnabled("organizations")`. Falls through to
 * `notFound()` when the feature is off so the page neither leaks its
 * existence nor crashes when the underlying provider lacks the
 * organization capability.
 */

import { isAuthFeatureEnabledSync } from "@nebutra/auth";
import { notFound, redirect } from "next/navigation";
import { MembersClient } from "@/components/settings/organization/members-client";
import { getAuth } from "@/lib/auth";

export const metadata = {
  title: "Members — Organization Settings",
};

export default async function OrganizationMembersPage() {
  if (!isAuthFeatureEnabledSync("organizations")) {
    notFound();
  }

  const authState = await getAuth();
  if (!authState.userId) {
    redirect("/sign-in");
  }

  if (!authState.orgId) {
    redirect("/select-org");
  }

  return <MembersClient orgId={authState.orgId} />;
}

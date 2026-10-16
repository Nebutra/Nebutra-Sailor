import { AvatarUploadForm } from "@/components/account/avatar-upload-form";
import { ProfileForm } from "@/components/account/profile-form";
import { DeleteOrganizationForm } from "@/components/organizations/delete-organization-form";
import { PermissionGate } from "@/components/PermissionGate";
import { getUser, requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsPageHeader } from "./settings-page-header";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { orgId } = await requireOrg();
  const [user, organization] = await Promise.all([
    getUser(),
    db.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
  ]);

  return (
    <div>
      <SettingsPageHeader section="general" />
      <ProfileForm />

      <AvatarUploadForm
        initialAvatarUrl={user?.imageUrl ?? null}
        email={user?.email ?? null}
        fallbackName={user?.name ?? user?.email ?? ""}
      />

      {/* The danger zone used to be a "Delete Organization" button with no
          handler. It is the real, owner-gated flow now (moved from Team). */}
      <PermissionGate require="org:delete">
        <DeleteOrganizationForm orgId={orgId} organizationName={organization?.name ?? ""} />
      </PermissionGate>
    </div>
  );
}

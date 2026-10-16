import { SettingsSection } from "@nebutra/ui/layout";
import { getTranslations } from "next-intl/server";
import { ChangeOrganizationNameForm } from "@/components/organizations/change-organization-name-form";
import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsPageHeader } from "../settings-page-header";
import { InviteMemberForm } from "./InviteMemberForm";
import { OrganizationLogoFormWithInvalidation } from "./OrganizationLogoFormWithInvalidation";
import { TeamMemberList } from "./TeamMemberList";

export const metadata = { title: "Team — Settings" };

export default async function TeamPage() {
  const tc = await getTranslations("copy.teamPage");
  const { orgId } = await requireOrg();

  const organization = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, logo: true },
  });

  const orgName = organization?.name ?? "";
  const orgLogo = organization?.logo ?? null;

  return (
    <div>
      <SettingsPageHeader section="team" />
      {/* Organization profile — admins only */}
      <PermissionGate require="team:manage">
        <OrganizationLogoFormWithInvalidation
          orgId={orgId}
          orgName={orgName}
          initialLogoUrl={orgLogo}
        />
        <ChangeOrganizationNameForm orgId={orgId} initialName={orgName} />
      </PermissionGate>

      {/* Invite section — admins only */}
      <PermissionGate require="team:invite">
        <SettingsSection title={tc("inviteATeamMember")} description={tc("sendAnInvitationTo")}>
          <InviteMemberForm orgId={orgId} />
        </SettingsSection>
      </PermissionGate>

      {/* Members list */}
      <SettingsSection title={tc("members")}>
        <TeamMemberList orgId={orgId} />
      </SettingsSection>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { ChangeOrganizationNameForm } from "@/components/organizations/change-organization-name-form";
import { DeleteOrganizationForm } from "@/components/organizations/delete-organization-form";
import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
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
    <div className="space-y-8">
      {/* Organization profile — admins only */}
      <PermissionGate require="team:manage">
        <section className="p-6 rounded-[var(--radius-lg)] border border-border bg-background">
          <h2 className="mb-1 text-base font-semibold text-foreground">
            {tc("organizationProfile")}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{tc("updateYourOrganizationS")}</p>
          <div className="space-y-6">
            <OrganizationLogoFormWithInvalidation
              orgId={orgId}
              orgName={orgName}
              initialLogoUrl={orgLogo}
            />
            <ChangeOrganizationNameForm orgId={orgId} initialName={orgName} />
          </div>
        </section>
      </PermissionGate>

      {/* Invite section — admins only */}
      <PermissionGate require="team:invite">
        <section className="p-6 rounded-[var(--radius-lg)] border border-border bg-background">
          <h2 className="mb-1 text-base font-semibold text-foreground">
            {tc("inviteATeamMember")}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{tc("sendAnInvitationTo")}</p>
          <InviteMemberForm orgId={orgId} />
        </section>
      </PermissionGate>

      {/* Members list */}
      <section className="p-6 rounded-[var(--radius-lg)] border border-border bg-background">
        <h2 className="mb-4 text-base font-semibold text-foreground">{tc("members")}</h2>
        <TeamMemberList orgId={orgId} />
      </section>

      {/* Danger zone — owners only */}
      <PermissionGate require="org:delete">
        <DeleteOrganizationForm orgId={orgId} organizationName={orgName} />
      </PermissionGate>
    </div>
  );
}

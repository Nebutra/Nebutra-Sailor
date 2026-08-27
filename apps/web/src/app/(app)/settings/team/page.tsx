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
          <h2 className="mb-1 text-base font-semibold text-foreground">Organization profile</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Update your organization's branding and display name.
          </p>
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
          <h2 className="mb-1 text-base font-semibold text-foreground">Invite a team member</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Send an invitation to add someone to your organization.
          </p>
          <InviteMemberForm orgId={orgId} />
        </section>
      </PermissionGate>

      {/* Members list */}
      <section className="p-6 rounded-[var(--radius-lg)] border border-border bg-background">
        <h2 className="mb-4 text-base font-semibold text-foreground">Members</h2>
        <TeamMemberList orgId={orgId} />
      </section>

      {/* Danger zone — owners only */}
      <PermissionGate require="org:delete">
        <DeleteOrganizationForm orgId={orgId} organizationName={orgName} />
      </PermissionGate>
    </div>
  );
}

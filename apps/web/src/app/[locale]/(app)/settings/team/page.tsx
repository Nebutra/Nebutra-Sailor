import { ChangeOrganizationNameForm } from "@/components/organizations/change-organization-name-form";
import { DeleteOrganizationForm } from "@/components/organizations/delete-organization-form";
import { OrganizationLogoForm } from "@/components/organizations/organization-logo-form";
import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { InviteMemberForm } from "./InviteMemberForm";
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
        <section className="p-6 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)]">
          <h2 className="mb-1 text-base font-semibold text-[var(--neutral-12)]">
            Organization profile
          </h2>
          <p className="mb-4 text-sm text-[var(--neutral-11)]">
            Update your organization's branding and display name.
          </p>
          <div className="space-y-6">
            <OrganizationLogoForm orgId={orgId} orgName={orgName} initialLogoUrl={orgLogo} />
            <ChangeOrganizationNameForm orgId={orgId} initialName={orgName} />
          </div>
        </section>
      </PermissionGate>

      {/* Invite section — admins only */}
      <PermissionGate require="team:invite">
        <section className="p-6 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)]">
          <h2 className="mb-1 text-base font-semibold text-[var(--neutral-12)]">
            Invite a team member
          </h2>
          <p className="mb-4 text-sm text-[var(--neutral-11)]">
            Send an invitation to add someone to your organization.
          </p>
          <InviteMemberForm orgId={orgId} />
        </section>
      </PermissionGate>

      {/* Members list */}
      <section className="p-6 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)]">
        <h2 className="mb-4 text-base font-semibold text-[var(--neutral-12)]">Members</h2>
        <TeamMemberList orgId={orgId} />
      </section>

      {/* Danger zone — owners only */}
      <PermissionGate require="org:delete">
        <DeleteOrganizationForm orgId={orgId} organizationName={orgName} />
      </PermissionGate>
    </div>
  );
}

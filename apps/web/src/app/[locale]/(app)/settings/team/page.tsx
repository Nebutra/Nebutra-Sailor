import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { InviteMemberForm } from "./InviteMemberForm";
import { TeamMemberList } from "./TeamMemberList";

export const metadata = { title: "Team — Settings" };

export default async function TeamPage() {
  const { orgId } = await requireOrg();

  return (
    <div className="space-y-8">
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
    </div>
  );
}

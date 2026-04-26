"use client";

import { ErrorState, LoadingState } from "@nebutra/ui/layout";
import Image from "next/image";
import { useEffect, useState } from "react";

type TeamRole = "owner" | "admin" | "member" | "viewer";

interface TeamMember {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  role: TeamRole;
  joinedAt: string;
}

interface MembersPayload {
  currentUserId: string;
  canManageRoles: boolean;
  canRemoveMembers: boolean;
  members: TeamMember[];
}

interface Props {
  orgId: string;
}

const roleLabels: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const editableRoles: Exclude<TeamRole, "owner">[] = ["admin", "member", "viewer"];

function memberDisplayName(member: TeamMember) {
  return member.user.name || member.user.email;
}

function initialsFor(member: TeamMember) {
  const label = memberDisplayName(member).trim();
  return label.slice(0, 2).toUpperCase() || "??";
}

function formatJoinedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function TeamMemberList({ orgId }: Props) {
  const [payload, setPayload] = useState<MembersPayload | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch(`/api/organizations/${orgId}/members`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load members");
        setPayload(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load members");
      } finally {
        setIsLoaded(true);
      }
    };

    fetchMembers();
  }, [orgId]);

  if (!isLoaded) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!payload) return <ErrorState message="Failed to load members" />;

  const memberCount = payload.members.length;
  const memberCountLabel = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;

  const requestMemberMutation = async (
    memberId: string,
    options: RequestInit,
    failureMessage: string,
  ) => {
    setBusyMemberId(memberId);
    setNotice(null);

    try {
      const res = await fetch(`/api/organizations/${orgId}/members/${memberId}`, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? failureMessage);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : failureMessage;
      setNotice(message);
      return null;
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRoleChange = async (member: TeamMember, role: TeamRole) => {
    if (member.role === role || role === "owner") return;

    const data = await requestMemberMutation(
      member.id,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
        headers: { "content-type": "application/json" },
      },
      "Failed to update member role",
    );

    if (!data?.member) return;

    setPayload((current) =>
      current
        ? {
            ...current,
            members: current.members.map((item) =>
              item.id === member.id ? { ...item, role: data.member.role } : item,
            ),
          }
        : current,
    );
    setNotice(`${memberDisplayName(member)} is now ${roleLabels[data.member.role as TeamRole]}.`);
  };

  const handleRemoveMember = (member: TeamMember) => {
    const isSelf = member.userId === payload.currentUserId;
    const label = memberDisplayName(member);
    const message = isSelf
      ? "Leave this organization? You may lose access immediately."
      : `Remove ${label} from this organization?`;

    if (!confirm(message)) return;

    void requestMemberMutation(
      member.id,
      { method: "DELETE" },
      isSelf ? "Failed to leave organization" : "Failed to remove member",
    ).then((data) => {
      if (!data?.ok) return;

      setPayload((current) =>
        current
          ? {
              ...current,
              members: current.members.filter((item) => item.id !== member.id),
            }
          : current,
      );
      setNotice(isSelf ? "You left this organization." : `${label} was removed.`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--neutral-12)]">{memberCountLabel}</p>
          <p className="text-xs text-[var(--neutral-11)]">
            {payload.canManageRoles
              ? "Admins can change roles, remove members, or leave their own organization."
              : "Role changes and member removal require an organization admin."}
          </p>
        </div>
        {!payload.canManageRoles && (
          <span className="rounded-full border border-[var(--neutral-7)] px-3 py-1 text-xs text-[var(--neutral-11)]">
            Admin actions disabled
          </span>
        )}
      </div>

      {notice && (
        <p className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-3 py-2 text-sm text-[var(--neutral-12)]">
          {notice}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--neutral-7)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--neutral-2)] text-xs uppercase tracking-[0.16em] text-[var(--neutral-10)]">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Joined</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--neutral-6)]">
            {payload.members.map((member) => {
              const isSelf = member.userId === payload.currentUserId;
              const isOwner = member.role === "owner";
              const isBusy = busyMemberId === member.id;
              const canChangeRole = payload.canManageRoles && !isOwner && !isBusy;
              const canRemove = (payload.canRemoveMembers || isSelf) && !isOwner && !isBusy;

              return (
                <tr key={member.id} className="bg-[var(--neutral-1)]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {member.user.image ? (
                        <Image
                          src={member.user.image}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-full bg-[var(--neutral-4)] text-xs font-semibold text-[var(--neutral-11)]">
                          {initialsFor(member)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--neutral-12)]">
                          {memberDisplayName(member)}
                          {isSelf && (
                            <span className="ml-2 rounded-full bg-[var(--neutral-3)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--neutral-10)]">
                              You
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-[var(--neutral-11)]">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-4 text-[var(--neutral-11)] md:table-cell">
                    {formatJoinedAt(member.joinedAt)}
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={member.role}
                      disabled={!canChangeRole}
                      onChange={(event) => handleRoleChange(member, event.target.value as TeamRole)}
                      aria-label={`Role for ${memberDisplayName(member)}`}
                      className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] disabled:cursor-not-allowed disabled:bg-[var(--neutral-2)] disabled:text-[var(--neutral-10)]"
                    >
                      {isOwner && <option value="owner">Owner</option>}
                      {editableRoles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      disabled={!canRemove}
                      onClick={() => handleRemoveMember(member)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:text-[var(--neutral-9)]"
                      aria-label={
                        isSelf
                          ? "Leave organization"
                          : `Remove ${memberDisplayName(member)} from organization`
                      }
                    >
                      {isSelf ? "Leave" : "Remove"}
                    </button>
                  </td>
                </tr>
              );
            })}

            {payload.members.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--neutral-11)]" colSpan={4}>
                  No members yet. Invite a teammate to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

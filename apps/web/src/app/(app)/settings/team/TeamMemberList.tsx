"use client";

import { ErrorState, LoadingState } from "@nebutra/ui/layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { dicebearAvatarUrl } from "@/lib/avatar";
import { queryKeys } from "@/lib/query-keys";

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

function formatJoinedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

async function fetchMembers(orgId: string, signal?: AbortSignal): Promise<MembersPayload> {
  const res = await fetch(`/api/organizations/${orgId}/members`, { signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load members");
  return data as MembersPayload;
}

async function patchMemberRole(
  orgId: string,
  memberId: string,
  role: TeamRole,
): Promise<{ member: { id: string; role: TeamRole } }> {
  const res = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
    headers: { "content-type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to update member role");
  return data as { member: { id: string; role: TeamRole } };
}

async function deleteMember(
  orgId: string,
  memberId: string,
  failureMessage: string,
): Promise<{ ok: boolean; action: string }> {
  const res = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? failureMessage);
  return data as { ok: boolean; action: string };
}

export function TeamMemberList({ orgId }: Props) {
  const t = useTranslations("startupOs");
  const queryClient = useQueryClient();
  const listKey = queryKeys.teamMembers.list(orgId);

  // Pure client state — UI feedback message + per-row busy indicator.
  // These are not server cache, so they stay local (NOT in react-query).
  const [notice, setNotice] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: listKey,
    queryFn: ({ signal }) => fetchMembers(orgId, signal),
  });

  const roleMutation = useMutation({
    mutationFn: (input: { member: TeamMember; role: TeamRole }) =>
      patchMemberRole(orgId, input.member.id, input.role),
    // Optimistically apply the new role to the cached list, mirroring the
    // previous behaviour where the Select reflected the change immediately.
    onMutate: async ({ member, role }) => {
      setBusyMemberId(member.id);
      setNotice(null);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<MembersPayload>(listKey);
      queryClient.setQueryData<MembersPayload>(listKey, (current) =>
        current
          ? {
              ...current,
              members: current.members.map((item) =>
                item.id === member.id ? { ...item, role } : item,
              ),
            }
          : current,
      );
      return { previous };
    },
    onSuccess: (data, { member }) => {
      const nextRole = data.member.role;
      // Reconcile with the server-confirmed role (PATCH echoes it back).
      queryClient.setQueryData<MembersPayload>(listKey, (current) =>
        current
          ? {
              ...current,
              members: current.members.map((item) =>
                item.id === member.id ? { ...item, role: nextRole } : item,
              ),
            }
          : current,
      );
      setNotice(`${memberDisplayName(member)} is now ${roleLabels[nextRole]}.`);
    },
    onError: (err, _input, context) => {
      // Roll back to the snapshot taken in onMutate (strictly safer than the
      // old code, which never reconciled on PATCH failure).
      if (context?.previous !== undefined) {
        queryClient.setQueryData<MembersPayload>(listKey, context.previous);
      }
      setNotice(err instanceof Error ? err.message : "Failed to update member role");
    },
    onSettled: () => {
      setBusyMemberId(null);
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (input: { member: TeamMember; isSelf: boolean }) =>
      deleteMember(
        orgId,
        input.member.id,
        input.isSelf ? "Failed to leave organization" : "Failed to remove member",
      ),
    // Optimistically drop the row, mirroring the previous immediate removal.
    onMutate: async ({ member }) => {
      setBusyMemberId(member.id);
      setNotice(null);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<MembersPayload>(listKey);
      queryClient.setQueryData<MembersPayload>(listKey, (current) =>
        current
          ? {
              ...current,
              members: current.members.filter((item) => item.id !== member.id),
            }
          : current,
      );
      return { previous };
    },
    onSuccess: (_data, { member, isSelf }) => {
      setNotice(
        isSelf ? "You left this organization." : `${memberDisplayName(member)} was removed.`,
      );
    },
    onError: (err, input, context) => {
      // Roll back the optimistic removal (the old code never reconciled on
      // DELETE failure).
      if (context?.previous !== undefined) {
        queryClient.setQueryData<MembersPayload>(listKey, context.previous);
      }
      const fallback = input.isSelf ? "Failed to leave organization" : "Failed to remove member";
      setNotice(err instanceof Error ? err.message : fallback);
    },
    onSettled: () => {
      setBusyMemberId(null);
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  if (membersQuery.isPending) return <LoadingState />;
  if (membersQuery.error) {
    const message =
      membersQuery.error instanceof Error ? membersQuery.error.message : "Failed to load members";
    return <ErrorState message={message} />;
  }

  const payload = membersQuery.data;

  const handleRoleChange = (member: TeamMember, role: TeamRole) => {
    if (member.role === role || role === "owner") return;
    roleMutation.mutate({ member, role });
  };

  const handleRemoveMember = (member: TeamMember) => {
    const isSelf = member.userId === payload.currentUserId;
    const label = memberDisplayName(member);
    const message = isSelf
      ? "Leave this organization? You may lose access immediately."
      : `Remove ${label} from this organization?`;

    if (!confirm(message)) return;

    removeMutation.mutate({ member, isSelf });
  };

  const memberCount = payload.members.length;
  const memberCountLabel = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{memberCountLabel}</p>
          <p className="text-xs text-muted-foreground">
            {payload.canManageRoles
              ? "Admins can change roles, remove members, or leave their own organization."
              : "Role changes and member removal require an organization admin."}
          </p>
        </div>
        {!payload.canManageRoles && (
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Admin actions disabled
          </span>
        )}
      </div>

      {notice && (
        <p className="rounded-[var(--radius-md)] border border-border bg-muted px-3 py-2 text-sm text-foreground">
          {notice}
        </p>
      )}

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Joined</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payload.members.map((member) => {
              const isSelf = member.userId === payload.currentUserId;
              const isOwner = member.role === "owner";
              const isBusy = busyMemberId === member.id;
              const canChangeRole = payload.canManageRoles && !isOwner && !isBusy;
              const canRemove = (payload.canRemoveMembers || isSelf) && !isOwner && !isBusy;

              return (
                <tr key={member.id} className="bg-background">
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
                        <img
                          src={dicebearAvatarUrl(member.user.email ?? member.user.name)}
                          alt=""
                          width={40}
                          height={40}
                          className="size-10 rounded-full object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {memberDisplayName(member)}
                          {isSelf && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              You
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-4 text-muted-foreground md:table-cell">
                    {formatJoinedAt(member.joinedAt)}
                  </td>
                  <td className="px-4 py-4">
                    <Select
                      value={member.role}
                      disabled={!canChangeRole}
                      onValueChange={(value) => handleRoleChange(member, value as TeamRole)}
                    >
                      <SelectTrigger aria-label={`Role for ${memberDisplayName(member)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                        {editableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      disabled={!canRemove}
                      onClick={() => handleRemoveMember(member)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-900 hover:text-red-900/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
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
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>
                  {t("emptyState.teamMembers")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

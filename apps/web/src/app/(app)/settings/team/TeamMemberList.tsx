"use client";

import { ErrorState, LoadingState } from "@nebutra/ui/layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  useConfirm,
} from "@nebutra/ui/primitives";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { dicebearAvatarUrl } from "@/lib/avatar";
import { queryKeys } from "@/lib/query-keys";

// The roster is flush inside its own bordered panel and keeps the settings-page
// 16px cell rhythm rather than the default table density.
const MEMBER_DENSITY = { "--table-cell-padding-x": "1rem", "--table-cell-padding-y": "1rem" };

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

/** Role → `copy.teamTeamMemberList.roles.*` (they used to be English constants, read in zh too). */
const ROLE_KEYS: Record<TeamRole, string> = {
  owner: "roles.owner",
  admin: "roles.admin",
  member: "roles.member",
  viewer: "roles.viewer",
};

const editableRoles: Exclude<TeamRole, "owner">[] = ["admin", "member", "viewer"];

function memberDisplayName(member: TeamMember) {
  return member.user.name || member.user.email;
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
  const tCopy = useTranslations("copy.teamTeamMemberList");
  const tc = useTranslations("copy.teamTeamMemberList");
  const t = useTranslations("startupOs");
  const format = useFormatter();
  const roleLabel = (role: TeamRole) => tc(ROLE_KEYS[role]);
  // Joined dates in the reader's locale (this was pinned to "en").
  const formatJoinedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return tc("unknownDate");
    return format.dateTime(date, { month: "short", day: "numeric", year: "numeric" });
  };
  const queryClient = useQueryClient();
  const listKey = queryKeys.teamMembers.list(orgId);
  const [confirm, confirmDialog] = useConfirm();

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
      setNotice(tc("roleChanged", { name: memberDisplayName(member), role: roleLabel(nextRole) }));
    },
    onError: (err, _input, context) => {
      // Roll back to the snapshot taken in onMutate (strictly safer than the
      // old code, which never reconciled on PATCH failure).
      if (context?.previous !== undefined) {
        queryClient.setQueryData<MembersPayload>(listKey, context.previous);
      }
      setNotice(err instanceof Error ? err.message : tCopy("failedToUpdateMember"));
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
        input.isSelf ? tCopy("failedToLeaveOrganization") : tCopy("failedToRemoveMember"),
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
        isSelf ? tCopy("youLeftThisOrganization") : `${memberDisplayName(member)} was removed.`,
      );
    },
    onError: (err, input, context) => {
      // Roll back the optimistic removal (the old code never reconciled on
      // DELETE failure).
      if (context?.previous !== undefined) {
        queryClient.setQueryData<MembersPayload>(listKey, context.previous);
      }
      const fallback = input.isSelf
        ? tCopy("failedToLeaveOrganization")
        : tCopy("failedToRemoveMember");
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
      membersQuery.error instanceof Error
        ? membersQuery.error.message
        : tCopy("failedToLoadMembers");
    return <ErrorState message={message} />;
  }

  const payload = membersQuery.data;

  const handleRoleChange = (member: TeamMember, role: TeamRole) => {
    if (member.role === role || role === "owner") return;
    roleMutation.mutate({ member, role });
  };

  const handleRemoveMember = async (member: TeamMember) => {
    const isSelf = member.userId === payload.currentUserId;
    const label = memberDisplayName(member);
    const ok = await confirm(
      isSelf
        ? {
            title: tCopy("leaveOrganization"),
            description: tCopy("youMayLoseAccess"),
            confirmLabel: tCopy("leave"),
            tone: "destructive",
          }
        : {
            title: `Remove ${label}`,
            description: `${label} loses access to this organization.`,
            confirmLabel: tCopy("remove"),
            tone: "destructive",
          },
    );
    if (!ok) return;

    removeMutation.mutate({ member, isSelf });
  };

  const memberCount = payload.members.length;
  const memberCountLabel = tc("memberCount", { count: memberCount });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{memberCountLabel}</p>
          <p className="text-xs text-muted-foreground">
            {payload.canManageRoles ? tCopy("adminsCanChangeRoles") : tCopy("roleChangesAndMember")}
          </p>
        </div>
        {!payload.canManageRoles && (
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {tc("adminActionsDisabled")}
          </span>
        )}
      </div>

      {notice && (
        <p className="rounded-[var(--radius-md)] border border-border bg-muted px-3 py-2 text-sm text-foreground">
          {notice}
        </p>
      )}

      <Table
        bare
        wrapperClassName="overflow-hidden rounded-[var(--radius-xl)] border border-border"
        wrapperStyle={MEMBER_DENSITY}
      >
        <Table.Header className="bg-muted text-xs uppercase tracking-[0.16em]">
          <Table.Row>
            <Table.Head>{tc("member")}</Table.Head>
            <Table.Head className="hidden md:table-cell">{tc("joined")}</Table.Head>
            <Table.Head>{tc("role")}</Table.Head>
            <Table.Head>{tc("action")}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body bordered>
          {payload.members.map((member) => {
            const isSelf = member.userId === payload.currentUserId;
            const isOwner = member.role === "owner";
            const isBusy = busyMemberId === member.id;
            const canChangeRole = payload.canManageRoles && !isOwner && !isBusy;
            const canRemove = (payload.canRemoveMembers || isSelf) && !isOwner && !isBusy;

            return (
              <Table.Row key={member.id} className="bg-background">
                <Table.Cell>
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
                            {tc("you")}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell className="hidden text-muted-foreground md:table-cell">
                  {formatJoinedAt(member.joinedAt)}
                </Table.Cell>
                <Table.Cell>
                  <Select
                    value={member.role}
                    disabled={!canChangeRole}
                    onValueChange={(value) => handleRoleChange(member, value as TeamRole)}
                  >
                    <SelectTrigger aria-label={tc("roleFor", { name: memberDisplayName(member) })}>
                      <SelectValue>{roleLabel(member.role)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {isOwner && <SelectItem value="owner">{tc("owner")}</SelectItem>}
                      {editableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Table.Cell>
                <Table.Cell>
                  <button
                    type="button"
                    disabled={!canRemove}
                    onClick={() => void handleRemoveMember(member)}
                    className="rounded px-2 py-1 text-xs font-medium text-destructive-strong hover:text-destructive-strong/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
                    aria-label={
                      isSelf
                        ? tCopy("leaveOrganization2")
                        : `Remove ${memberDisplayName(member)} from organization`
                    }
                  >
                    {isSelf ? tCopy("leave") : tCopy("remove")}
                  </button>
                </Table.Cell>
              </Table.Row>
            );
          })}

          {payload.members.length === 0 && (
            <Table.Row>
              <Table.Cell alignment="center" colSpan={4} className="py-8 text-muted-foreground">
                {t("emptyState.teamMembers")}
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
      {confirmDialog}
    </div>
  );
}

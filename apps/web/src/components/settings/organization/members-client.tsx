"use client";

/**
 * Members management UI — phase 2.5.
 *
 * Lists members of the active organization with role-change + remove flows
 * gated by `canManageRoles` / `canRemoveMembers` from the GET response.
 *
 * Server contract (already implemented in
 * `apps/web/src/app/api/organizations/[orgId]/members/route.ts`):
 *   - GET    /api/organizations/[orgId]/members            → list
 *   - POST   /api/organizations/[orgId]/members            → invite
 *   - PATCH  /api/organizations/[orgId]/members/[memberId] → change role
 *   - DELETE /api/organizations/[orgId]/members/[memberId] → remove
 *
 * Server reads run through React Query (`useQuery` + the shared queryKey
 * factory); writes are `useMutation`s. The role-change mutation invalidates the
 * member list on settle (background refresh, mirroring the old `await
 * loadMembers()`); the remove mutation is optimistic — it snapshots + drops the
 * row from the cached list immediately, rolls back on failure, and refetches on
 * settle. The query's `signal` replaces the old manual fetch lifecycle. Pure UI
 * state (dialog open/close, pending row id, success toast) stays local.
 */

import { Trash as Trash2 } from "@nebutra/icons";
import { AnimateIn, Button } from "@nebutra/ui/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { queryKeys } from "@/lib/query-keys";
import { InviteDialog } from "./invite-dialog";

type Role = "owner" | "admin" | "member" | "viewer";

interface Member {
  id: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface MembersResponse {
  currentUserId: string | null;
  canManageRoles: boolean;
  canRemoveMembers: boolean;
  members: Member[];
}

interface MembersClientProps {
  orgId: string;
}

async function fetchMembers(orgId: string, signal?: AbortSignal): Promise<MembersResponse> {
  const response = await fetch(`/api/organizations/${orgId}/members`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load members (${response.status})`);
  }
  const data = (await response.json()) as Partial<MembersResponse>;
  return {
    currentUserId: data.currentUserId ?? null,
    canManageRoles: Boolean(data.canManageRoles),
    canRemoveMembers: Boolean(data.canRemoveMembers),
    members: data.members ?? [],
  };
}

async function changeRole(orgId: string, memberId: string, role: Role): Promise<void> {
  const response = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    throw new Error(`Failed to change role (${response.status})`);
  }
}

async function removeMember(orgId: string, memberId: string): Promise<void> {
  const response = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to remove member (${response.status})`);
  }
}

export function MembersClient({ orgId }: MembersClientProps) {
  const t = useTranslations("settings.organization.members");
  const tInvite = useTranslations("settings.organization.invite");
  const format = useFormatter();
  const confirmDialogId = useId();
  const queryClient = useQueryClient();
  const listKey = queryKeys.orgMembers.list(orgId);

  // Pure UI / client state stays local — not server cache.
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: listKey,
    queryFn: ({ signal }) => fetchMembers(orgId, signal),
  });

  const data = membersQuery.data;
  const members = data?.members ?? [];
  const currentUserId = data?.currentUserId ?? null;
  const canManageRoles = data?.canManageRoles ?? false;
  const canRemoveMembers = data?.canRemoveMembers ?? false;

  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      changeRole(orgId, memberId, role),
    // Background refresh after a successful PATCH — mirrors the old
    // `await loadMembers()`.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(orgId, memberId),
    // Optimistically drop the row from the cached list, mirroring the
    // immediate-row-removal the old confirm flow implied; with NEW rollback on
    // failure (the old code never reconciled a failed DELETE).
    onMutate: async (memberId: string) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<MembersResponse>(listKey);
      queryClient.setQueryData<MembersResponse>(listKey, (current) =>
        current
          ? { ...current, members: current.members.filter((m) => m.id !== memberId) }
          : current,
      );
      return { previous };
    },
    onError: (_err, _memberId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<MembersResponse>(listKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const handleRoleChange = (memberId: string, nextRole: Role) => {
    if (pendingMemberId) return;
    setPendingMemberId(memberId);
    roleMutation.mutate(
      { memberId, role: nextRole },
      {
        onSettled: () => {
          setPendingMemberId(null);
        },
      },
    );
  };

  const handleConfirmRemove = (memberId: string) => {
    setPendingMemberId(memberId);
    setConfirmRemoveId(null);
    removeMutation.mutate(memberId, {
      onSettled: () => {
        setPendingMemberId(null);
      },
    });
  };

  const errorMessage = membersQuery.error ? t("errorLoad") : null;

  return (
    <AnimateIn preset="fadeUp">
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-neutral-12">{t("heading")}</h1>
            <p className="text-sm text-neutral-11">{t("description")}</p>
          </div>
          <Button htmlType="button" onClick={() => setInviteOpen(true)}>
            {t("invite")}
          </Button>
        </header>

        {successMessage && (
          <p
            role="status"
            className="rounded-[var(--radius-sm)] bg-[color:var(--status-success)]/10 px-3 py-2 text-xs text-[color:var(--status-success)]"
          >
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="rounded-[var(--radius-sm)] bg-[color:var(--status-danger)]/10 px-3 py-2 text-xs text-[color:var(--status-danger)]"
          >
            {errorMessage}
          </p>
        )}

        {membersQuery.isPending ? (
          <p className="text-sm text-neutral-11">{t("loading")}</p>
        ) : members.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-neutral-7 px-4 py-6 text-center text-sm text-neutral-11">
            {t("empty")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-neutral-7">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-2 text-xs uppercase text-neutral-11">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("columnMember")}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("columnRole")}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("columnJoined")}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    <span className="sr-only">{t("columnActions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-6">
                {members.map((member) => {
                  const isSelf = member.userId === currentUserId;
                  const isOwner = member.role === "owner";
                  const canEditRole = canManageRoles && !isSelf && !isOwner;
                  const canRemove = canRemoveMembers && !isSelf && !isOwner;
                  const displayName = member.user.name ?? member.user.email;
                  return (
                    <tr key={member.id} className="bg-neutral-1 dark:bg-transparent">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-semibold text-white"
                            aria-hidden
                          >
                            {(displayName?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-neutral-12">
                              {displayName}
                            </div>
                            <div className="truncate text-xs text-neutral-11">
                              {member.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {canEditRole ? (
                          <Select
                            disabled={pendingMemberId === member.id}
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.id, value as Role)}
                          >
                            <SelectTrigger aria-label={`${t("changeRole")} for ${displayName}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">{t("role.admin")}</SelectItem>
                              <SelectItem value="member">{t("role.member")}</SelectItem>
                              <SelectItem value="viewer">{t("role.viewer")}</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-neutral-11">
                            {t(`role.${member.role}` as `role.${Role}`)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-11">
                        {Number.isNaN(new Date(member.joinedAt).getTime())
                          ? member.joinedAt
                          : format.dateTime(new Date(member.joinedAt), {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canRemove && (
                          <button
                            type="button"
                            aria-label={`${t("remove")} ${displayName}`}
                            onClick={() => setConfirmRemoveId(member.id)}
                            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[color:var(--status-danger)] transition-colors hover:bg-[color:var(--status-danger)]/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            <span>{t("remove")}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <InviteDialog
          orgId={orgId}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            setSuccessMessage(tInvite("success"));
            void queryClient.invalidateQueries({ queryKey: listKey });
          }}
        />

        {confirmRemoveId && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmDialogId}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-1 p-5 shadow-xl">
              <h2 id={confirmDialogId} className="text-sm font-semibold text-neutral-12">
                {t("confirmRemove")}
              </h2>
              <div className="mt-4 flex justify-end gap-2">
                <Button htmlType="button" onClick={() => setConfirmRemoveId(null)}>
                  {t("cancel")}
                </Button>
                <Button
                  htmlType="button"
                  onClick={() => handleConfirmRemove(confirmRemoveId)}
                  disabled={pendingMemberId === confirmRemoveId}
                >
                  {t("confirm")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimateIn>
  );
}

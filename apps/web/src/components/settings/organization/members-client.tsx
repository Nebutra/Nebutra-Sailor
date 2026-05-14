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
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
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
  currentUserId: string;
  canManageRoles?: boolean;
  canRemoveMembers?: boolean;
  members: Member[];
}

interface MembersClientProps {
  orgId: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export function MembersClient({ orgId }: MembersClientProps) {
  const t = useTranslations("settings.organization.members");
  const tInvite = useTranslations("settings.organization.invite");
  const confirmDialogId = useId();

  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [canRemoveMembers, setCanRemoveMembers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/organizations/${orgId}/members`);
      if (!response.ok) {
        setErrorMessage(t("errorLoad"));
        return;
      }
      const data = (await response.json()) as MembersResponse;
      setMembers(data.members ?? []);
      setCurrentUserId(data.currentUserId ?? null);
      setCanManageRoles(Boolean(data.canManageRoles));
      setCanRemoveMembers(Boolean(data.canRemoveMembers));
    } catch {
      setErrorMessage(t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handleRoleChange = useCallback(
    async (memberId: string, nextRole: Role) => {
      if (pendingMemberId) return;
      setPendingMemberId(memberId);
      setErrorMessage(null);
      try {
        const response = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ role: nextRole }),
        });
        if (!response.ok) {
          setErrorMessage(t("errorLoad"));
          return;
        }
        await loadMembers();
      } finally {
        setPendingMemberId(null);
      }
    },
    [orgId, pendingMemberId, t, loadMembers],
  );

  const handleConfirmRemove = useCallback(
    async (memberId: string) => {
      setPendingMemberId(memberId);
      setErrorMessage(null);
      try {
        const response = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!response.ok) {
          setErrorMessage(t("errorLoad"));
          return;
        }
        setConfirmRemoveId(null);
        await loadMembers();
      } finally {
        setPendingMemberId(null);
      }
    },
    [orgId, t, loadMembers],
  );

  return (
    <AnimateIn preset="fadeUp">
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-neutral-12 dark:text-white">
              {t("heading")}
            </h1>
            <p className="text-sm text-neutral-11 dark:text-white/60">{t("description")}</p>
          </div>
          <Button htmlType="button" onClick={() => setInviteOpen(true)}>
            {t("invite")}
          </Button>
        </header>

        {successMessage && (
          <p
            role="status"
            className="rounded-sm bg-[color:var(--status-success)]/10 px-3 py-2 text-xs text-[color:var(--status-success)]"
          >
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="rounded-sm bg-[color:var(--status-danger)]/10 px-3 py-2 text-xs text-[color:var(--status-danger)]"
          >
            {errorMessage}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-neutral-11">{t("loading")}</p>
        ) : members.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-7 px-4 py-6 text-center text-sm text-neutral-11 dark:border-white/10">
            {t("empty")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-neutral-7 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-2 text-xs uppercase text-neutral-11 dark:bg-white/5 dark:text-white/60">
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
              <tbody className="divide-y divide-neutral-6 dark:divide-white/10">
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
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-semibold text-white"
                            aria-hidden
                          >
                            {(displayName?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-neutral-12 dark:text-white">
                              {displayName}
                            </div>
                            <div className="truncate text-xs text-neutral-11 dark:text-white/60">
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
                            onValueChange={(value) =>
                              void handleRoleChange(member.id, value as Role)
                            }
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
                          <span className="text-xs text-neutral-11 dark:text-white/60">
                            {t(`role.${member.role}` as `role.${Role}`)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-11 dark:text-white/60">
                        {formatDate(member.joinedAt)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canRemove && (
                          <button
                            type="button"
                            aria-label={`${t("remove")} ${displayName}`}
                            onClick={() => setConfirmRemoveId(member.id)}
                            className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-[color:var(--status-danger)] transition-colors hover:bg-[color:var(--status-danger)]/10"
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
            void loadMembers();
          }}
        />

        {confirmRemoveId && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmDialogId}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <div className="w-full max-w-sm rounded-lg border border-neutral-7 bg-neutral-1 p-5 shadow-xl dark:border-white/10 dark:bg-neutral-12">
              <h2
                id={confirmDialogId}
                className="text-sm font-semibold text-neutral-12 dark:text-white"
              >
                {t("confirmRemove")}
              </h2>
              <div className="mt-4 flex justify-end gap-2">
                <Button htmlType="button" onClick={() => setConfirmRemoveId(null)}>
                  {t("cancel")}
                </Button>
                <Button
                  htmlType="button"
                  onClick={() => void handleConfirmRemove(confirmRemoveId)}
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

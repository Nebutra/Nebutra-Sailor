"use client";

import { useActionState } from "react";
import { type InviteState, inviteTeamMember } from "./actions";

interface Props {
  orgId: string;
}

const INITIAL: InviteState = { status: "idle" };

export function InviteMemberForm({ orgId }: Props) {
  const [state, action, isPending] = useActionState(inviteTeamMember, INITIAL);

  return (
    <form action={action} className="flex gap-3">
      <input type="hidden" name="orgId" value={orgId} />

      <input
        type="email"
        name="email"
        required
        placeholder="colleague@company.com"
        disabled={isPending}
        className="flex-1 rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] placeholder:text-[var(--neutral-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 disabled:opacity-50"
      />

      <select
        name="role"
        disabled={isPending}
        defaultValue="org:member"
        className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
      >
        <option value="org:member">Member</option>
        <option value="org:admin">Admin</option>
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        style={{ background: "var(--brand-gradient)" }}
      >
        {isPending ? "Sending…" : "Invite"}
      </button>

      {state.status === "success" && (
        <p className="self-center text-sm text-green-600">Invitation sent!</p>
      )}
      {state.status === "error" && (
        <p className="self-center text-sm text-red-600">{state.message}</p>
      )}
    </form>
  );
}

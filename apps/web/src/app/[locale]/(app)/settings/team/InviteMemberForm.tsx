"use client";

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";
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
      <input data-allow-native type="hidden" name="orgId" value={orgId} />

      <Input
        type="email"
        name="email"
        required
        placeholder="colleague@company.com"
        disabled={isPending}
      />

      <Select name="role" disabled={isPending} defaultValue="org:member">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="org:member">Member</SelectItem>
          <SelectItem value="org:admin">Admin</SelectItem>
          <SelectItem value="org:viewer">Viewer</SelectItem>
        </SelectContent>
      </Select>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        style={{ background: "var(--brand-gradient)" }}
      >
        {isPending ? "Sending…" : "Invite"}
      </button>

      {state.status === "success" && (
        <p className="self-center text-sm text-green-11">Invitation sent!</p>
      )}
      {state.status === "error" && (
        <p className="self-center text-sm text-red-11">{state.message}</p>
      )}
    </form>
  );
}

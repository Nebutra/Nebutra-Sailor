"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Field,
  Input,
  Select,
} from "@nebutra/ui/primitives";
import { useState, useTransition } from "react";
import { grantStaffAction, revokeStaffAction, type StaffActionResult } from "@/app/staff/actions";

/**
 * Grant and revoke for the Staff page. Each opens a dialog that asks for the
 * note (required, kept with the grant) and shows the audit id on success. The
 * gateway's refusal (self-grant, last owner, not an owner) is shown verbatim
 * with its code; nothing is retried or worked around here.
 */

const ROLE_OPTIONS = [
  { value: "platform_readonly", label: "Read-only: dashboards" },
  { value: "platform_support", label: "Support: tenant lookup, invites" },
  { value: "platform_operator", label: "Operator: supply, queues, suspension" },
  { value: "platform_owner", label: "Owner: also grants and revokes staff" },
] as const;

function Outcome({ result }: { result: StaffActionResult | null }) {
  if (!result) return null;
  if (!result.ok) {
    return (
      <p
        role="alert"
        className="rounded-md border border-destructive-strong/30 px-3 py-2 text-destructive-strong text-xs"
      >
        <span className="font-mono">{result.code}</span> · {result.message}
      </p>
    );
  }
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
      <p className="leading-5">{result.message}</p>
      {result.auditId ? (
        <p className="mt-1 font-mono text-muted-foreground text-xs">audit {result.auditId}</p>
      ) : null}
    </div>
  );
}

export function GrantStaffButton() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("platform_operator");
  const [result, setResult] = useState<StaffActionResult | null>(null);
  const [pending, start] = useTransition();
  const done = result?.ok === true;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ink"
        className="h-8 px-3 text-xs"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        Grant access
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-0 p-0">
          <form
            action={(form) => {
              form.set("role", role);
              start(async () => setResult(await grantStaffAction(form)));
            }}
          >
            <div className="border-border border-b px-5 py-4">
              <DialogTitle className="font-semibold text-sm leading-5">
                Grant platform access
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-muted-foreground text-xs">
                The person needs an account already. Changing the role of someone who already has
                access works the same way.
              </DialogDescription>
            </div>
            <div className="space-y-4 px-5 py-4 text-sm">
              <Field label="Email" htmlFor="staff-email">
                <Input id="staff-email" name="email" type="email" required disabled={done} />
              </Field>
              <Field label="Role" htmlFor="staff-role">
                <Select
                  id="staff-role"
                  value={role}
                  onValueChange={(v) => v && setRole(v)}
                  options={ROLE_OPTIONS}
                  disabled={done}
                />
              </Field>
              <Field label="Why" htmlFor="staff-note">
                <Input
                  id="staff-note"
                  name="note"
                  required
                  minLength={3}
                  maxLength={500}
                  placeholder="Ticket, rotation, on-call handover"
                  disabled={done}
                />
              </Field>
              <Outcome result={result} />
            </div>
            <DialogFooter className="border-border border-t px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                {done ? "Close" : "Cancel"}
              </Button>
              {done ? null : (
                <Button type="submit" variant="ink" size="sm" disabled={pending}>
                  {pending ? "Granting…" : "Grant"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RevokeStaffButton({ userId, label }: { userId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<StaffActionResult | null>(null);
  const [pending, start] = useTransition();
  const done = result?.ok === true;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-xs"
        aria-label={`Revoke access for ${label}`}
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        Revoke
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-0 p-0">
          <form
            action={(form) => {
              form.set("userId", userId);
              start(async () => setResult(await revokeStaffAction(form)));
            }}
          >
            <div className="border-border border-b px-5 py-4">
              <DialogTitle className="font-semibold text-sm leading-5">Revoke access</DialogTitle>
              <DialogDescription className="mt-0.5 text-muted-foreground text-xs">
                {label} loses platform access now. The grant stays in the list as revoked, with your
                note. The last owner cannot be revoked.
              </DialogDescription>
            </div>
            <div className="space-y-4 px-5 py-4 text-sm">
              <Field label="Why" htmlFor={`revoke-note-${userId}`}>
                <Input
                  id={`revoke-note-${userId}`}
                  name="note"
                  required
                  minLength={3}
                  maxLength={500}
                  placeholder="Left the team, rotation, handover"
                  disabled={done}
                />
              </Field>
              <Outcome result={result} />
            </div>
            <DialogFooter className="border-border border-t px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                {done ? "Close" : "Cancel"}
              </Button>
              {done ? null : (
                <Button type="submit" variant="destructive" size="sm" disabled={pending}>
                  {pending ? "Revoking…" : "Revoke"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

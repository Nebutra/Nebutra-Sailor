"use client";

import { brand } from "@nebutra/brand/metadata";
import { Button, Field, Input } from "@nebutra/ui/primitives";
import { useEffect, useState } from "react";

type VerifyStatus = "pending" | "approved" | "denied";

interface VerifyResponse {
  user_code: string;
  status: VerifyStatus;
}

/** `WCQM9PDH` → `WCQM-9PDH`. Mirrors formatUserCodeForDisplay() in
 * packages/iam/auth/src/providers/better-auth/device-authorization.ts —
 * duplicated rather than imported so this client bundle doesn't pull in the
 * server-only auth provider package. */
function formatUserCode(raw: string): string {
  const clean = raw.replace(/-/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

type Step =
  | { kind: "enter-code" }
  | { kind: "checking" }
  | { kind: "confirm"; userCode: string }
  | { kind: "done"; outcome: "approved" | "denied" }
  | { kind: "error"; message: string };

async function parseErrorDescription(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error_description?: string; message?: string };
    return body.error_description || body.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export function DeviceApprovalForm({
  defaultUserCode,
  signedInEmail,
}: {
  defaultUserCode: string;
  signedInEmail: string | null;
}) {
  const [codeInput, setCodeInput] = useState(formatUserCode(defaultUserCode));
  const [step, setStep] = useState<Step>({ kind: "enter-code" });

  async function checkCode(userCode: string) {
    const clean = userCode.replace(/-/g, "").trim();
    if (!clean) return;
    setStep({ kind: "checking" });
    try {
      const res = await fetch(`/api/auth/device?user_code=${encodeURIComponent(clean)}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setStep({ kind: "error", message: await parseErrorDescription(res) });
        return;
      }
      const data = (await res.json()) as VerifyResponse;
      if (data.status === "approved") {
        setStep({ kind: "done", outcome: "approved" });
        return;
      }
      if (data.status === "denied") {
        setStep({ kind: "done", outcome: "denied" });
        return;
      }
      setStep({ kind: "confirm", userCode: clean });
    } catch {
      setStep({
        kind: "error",
        message: "Could not reach the auth center. Check your connection.",
      });
    }
  }

  // Prefilled from ?user_code= (the CLI's verification_uri_complete) — check
  // immediately so a signed-in user lands straight on confirm.
  useEffect(() => {
    if (defaultUserCode.trim()) {
      void checkCode(defaultUserCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respond(userCode: string, decision: "approve" | "deny") {
    setStep({ kind: "checking" });
    try {
      const res = await fetch(`/api/auth/device/${decision}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userCode }),
      });
      if (!res.ok) {
        setStep({ kind: "error", message: await parseErrorDescription(res) });
        return;
      }
      setStep({ kind: "done", outcome: decision === "approve" ? "approved" : "denied" });
    } catch {
      setStep({
        kind: "error",
        message: "Could not reach the auth center. Check your connection.",
      });
    }
  }

  return (
    <div className="grid gap-6 rounded-lg border border-border bg-card p-8 shadow-ambient-sm">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold text-foreground">Authorize a device</h1>
        {signedInEmail && (
          <p className="text-sm text-muted-foreground">Signed in as {signedInEmail}</p>
        )}
      </div>

      {(step.kind === "enter-code" || step.kind === "checking") && (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void checkCode(codeInput);
          }}
        >
          <Field
            label="Device code"
            htmlFor="user-code"
            description="Shown on the device you're signing in."
          >
            <Input
              id="user-code"
              name="user_code"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="XXXX-XXXX"
              value={codeInput}
              disabled={step.kind === "checking"}
              onChange={(event) => setCodeInput(formatUserCode(event.target.value))}
            />
          </Field>
          <Button type="submit" disabled={step.kind === "checking" || !codeInput.trim()}>
            {step.kind === "checking" ? "Checking…" : "Continue"}
          </Button>
        </form>
      )}

      {step.kind === "confirm" && (
        <div className="grid gap-4">
          <p className="text-sm text-foreground">
            Code <span className="font-mono font-semibold">{formatUserCode(step.userCode)}</span>{" "}
            wants to sign in as you on the {brand.name} CLI. If you didn't run{" "}
            <span className="font-mono">nebutra login</span>, deny this request.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void respond(step.userCode, "deny")}
            >
              Deny
            </Button>
            <Button type="button" onClick={() => void respond(step.userCode, "approve")}>
              Approve
            </Button>
          </div>
        </div>
      )}

      {step.kind === "done" && (
        <p className="text-sm text-foreground">
          {step.outcome === "approved"
            ? "Device authorized. You can close this tab and return to your terminal."
            : "Request denied. You can close this tab."}
        </p>
      )}

      {step.kind === "error" && (
        <div className="grid gap-3">
          <p className="text-sm text-destructive">{step.message}</p>
          <Button type="button" variant="outline" onClick={() => setStep({ kind: "enter-code" })}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

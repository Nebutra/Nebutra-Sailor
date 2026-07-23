// @brand-exempt: OAuth consent shell copy for Nebutra IdP
/**
 * OAuth Consent Screen (Authorization Page)
 *
 * Design: token surfaces aligned with auth-center / Agent OS (no raw slate/amber).
 */

import { SCOPE_DESCRIPTIONS } from "@nebutra/oauth-server";
import { ConsentForm } from "./consent-form";

export const dynamic = "force-dynamic";

interface AuthorizePageProps {
  searchParams: Promise<{ uid?: string }>;
}

export default async function AuthorizePage({ searchParams }: AuthorizePageProps) {
  const params = await searchParams;
  const uid = params.uid;

  if (!uid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-[var(--radius-xl)] border border-destructive/20 bg-destructive/10 px-8 py-6 text-center">
          <h1 className="text-xl font-semibold text-destructive">Invalid Request</h1>
          <p className="mt-2 text-sm text-destructive/80">Missing interaction ID.</p>
        </div>
      </div>
    );
  }

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-[var(--radius-xl)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-8 py-6 text-center shadow-[var(--elevation-md)]">
          <h1 className="text-xl font-semibold text-[var(--neutral-12)]">
            Authorization UI unavailable
          </h1>
          <p className="mt-2 text-sm text-[var(--neutral-10)]">
            Nebutra-owned SSO is deployed only after the login and consent interaction handlers are
            connected to the canonical user session.
          </p>
        </div>
      </div>
    );
  }

  const interactionDetails = {
    uid,
    prompt: { name: "consent", details: {} },
    params: {
      client_id: "unknown",
      scope: "openid profile",
      redirect_uri: "",
    },
  };

  const requestedScopes = ((interactionDetails.params.scope as string) || "")
    .split(" ")
    .filter(Boolean);

  const scopeItems = requestedScopes.map((scope) => ({
    scope,
    ...((SCOPE_DESCRIPTIONS as Record<string, { label: string; description: string }>)[scope] || {
      label: scope,
      description: `Access to ${scope}`,
    }),
  }));

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(80% 60% at 0% 0%, color-mix(in srgb, var(--blue-9) 14%, transparent), transparent 55%), radial-gradient(80% 60% at 100% 100%, color-mix(in srgb, var(--cyan-9) 12%, transparent), transparent 55%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-8 shadow-[var(--elevation-lg)]">
          <div className="mb-8 text-center">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] text-2xl font-bold text-[var(--neutral-1)]"
              style={{
                background: "linear-gradient(135deg, var(--blue-9), var(--cyan-9))",
              }}
            >
              N
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--neutral-12)]">
              Authorize Access
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-10)]">
              <span className="font-medium text-[var(--neutral-12)]">
                {interactionDetails.params.client_id}
              </span>{" "}
              wants to access your Nebutra account
            </p>
          </div>

          <div className="mb-8 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-9)]">
              Requested Permissions
            </p>
            <div className="space-y-2">
              {scopeItems.map((item) => (
                <div
                  key={item.scope}
                  className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] px-4 py-3"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--blue-9)_18%,transparent)] text-[var(--blue-11)]">
                    <svg
                      aria-hidden="true"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--neutral-12)]">{item.label}</p>
                    <p className="text-xs text-[var(--neutral-10)]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ConsentForm uid={uid} />

          <p className="mt-6 text-center text-xs text-[var(--neutral-9)]">
            By authorizing, you agree to share the above data with this application. You can revoke
            access at any time from your Nebutra settings.
          </p>
        </div>
      </div>
    </div>
  );
}

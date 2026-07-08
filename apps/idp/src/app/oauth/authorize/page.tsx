/**
 * OAuth Consent Screen (Authorization Page)
 *
 * This is the page users see when a third-party app requests access
 * to their Nebutra data. It shows:
 * - Which app is requesting access
 * - What permissions (scopes) are being requested
 * - Allow / Deny buttons
 *
 * Design: Glassmorphism card, brand-consistent, premium UX.
 */

import { SCOPE_DESCRIPTIONS } from "@nebutra/oauth-server";
import { ConsentForm } from "./consent-form";

// Force dynamic rendering — consent page requires database at runtime
export const dynamic = "force-dynamic";

interface AuthorizePageProps {
  searchParams: Promise<{ uid?: string }>;
}

export default async function AuthorizePage({ searchParams }: AuthorizePageProps) {
  const params = await searchParams;
  const uid = params.uid;

  if (!uid) {
    return (
      <div className="p-4 flex min-h-screen items-center justify-center">
        <div className="border-red-500/20 bg-red-950/30 px-8 py-6 backdrop-blur-xl rounded-2xl border text-center">
          <h1 className="text-xl font-semibold text-red-400">Invalid Request</h1>
          <p className="mt-2 text-sm text-red-300/70">Missing interaction ID.</p>
        </div>
      </div>
    );
  }

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="p-4 flex min-h-screen items-center justify-center">
        <div className="border-amber-500/20 bg-amber-950/30 max-w-md px-8 py-6 backdrop-blur-xl rounded-2xl border text-center">
          <h1 className="text-xl font-semibold text-amber-300">Authorization UI unavailable</h1>
          <p className="mt-2 text-sm text-amber-100/70">
            Nebutra-owned SSO is deployed only after the login and consent interaction handlers are
            connected to the canonical user session.
          </p>
        </div>
      </div>
    );
  }

  // Development shell only. Production must resolve real interaction details via:
  //   const { getOIDCProvider } = await import("@/lib/oidc");
  //   const provider = getOIDCProvider();
  //   const interactionDetails = await provider.interactionDetails(req, res);
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
    <div className="p-4 flex min-h-screen items-center justify-center">
      {/* Ambient glow */}
      <div className="inset-0 pointer-events-none fixed overflow-hidden">
        <div className="-left-40 -top-40 h-96 w-96 bg-blue-600/10 blur-3xl absolute rounded-full" />
        <div className="-bottom-40 -right-40 h-96 w-96 bg-cyan-600/10 blur-3xl absolute rounded-full" />
      </div>

      {/* Consent card */}
      <div className="max-w-md relative w-full">
        {/* Glassmorphism card */}
        <div className="border-white/10 bg-white/5 p-8 backdrop-blur-2xl rounded-3xl border shadow-2xl">
          {/* App info header */}
          <div className="mb-8 text-center">
            {/* Nebutra logo placeholder */}
            <div className="mb-4 h-16 w-16 from-blue-500 to-cyan-500 text-2xl font-bold shadow-blue-500/25 mx-auto flex items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg">
              N
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Authorize Access</h1>
            <p className="mt-2 text-sm text-white/60">
              <span className="font-medium text-white/90">
                {interactionDetails.params.client_id}
              </span>{" "}
              wants to access your Nebutra account
            </p>
          </div>

          {/* Requested permissions */}
          <div className="mb-8 space-y-3">
            <p className="text-xs font-medium tracking-wider text-white/40 uppercase">
              Requested Permissions
            </p>
            <div className="space-y-2">
              {scopeItems.map((item) => (
                <div
                  key={item.scope}
                  className="gap-3 border-white/5 bg-white/5 px-4 py-3 flex items-start rounded-xl border"
                >
                  <div className="mt-0.5 h-5 w-5 bg-blue-500/20 text-blue-400 flex shrink-0 items-center justify-center rounded-full">
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
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-white/50">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <ConsentForm uid={uid} />

          {/* Footer */}
          <p className="mt-6 text-xs text-white/30 text-center">
            By authorizing, you agree to share the above data with this application. You can revoke
            access at any time from your Nebutra settings.
          </p>
        </div>
      </div>
    </div>
  );
}

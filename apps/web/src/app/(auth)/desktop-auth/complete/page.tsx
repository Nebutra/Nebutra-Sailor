import { issueDesktopAuthHandoff, parseDesktopAuthRequest } from "@nebutra/auth/desktop";
import { brand } from "@nebutra/brand/metadata";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { DesktopAuthCompleteHandoff } from "@/components/auth/desktop-auth-complete-handoff";
import { createServerRequestFromHeaders, getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type SearchParams = {
  scheme?: string;
  state?: string;
  mode?: "sign-in" | "sign-up";
  public_beta?: string;
};

const DESKTOP_APP_NAME = `${brand.name} Foundry`;

// Cookie-based i18n: no locale prefix in URLs.
function buildCompletionPath(query: SearchParams): string {
  const params = new URLSearchParams();
  if (query.scheme) params.set("scheme", query.scheme);
  if (query.state) params.set("state", query.state);
  if (query.mode) params.set("mode", query.mode);
  if (query.public_beta) params.set("public_beta", query.public_beta);
  return `/desktop-auth/complete?${params.toString()}`;
}

function buildDesktopRedirectUrl(scheme: string, token: string, state: string): string {
  const url = new URL(`${scheme}://auth/desktop_redirect`);
  url.searchParams.set("desktop_token", token);
  url.searchParams.set("state", state);
  return url.toString();
}

function DesktopAuthError() {
  return (
    <AuthSplitLayout>
      <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
          Desktop sign-in
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
          This desktop sign-in link is invalid
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Restart sign-in from {DESKTOP_APP_NAME} to create a fresh, short-lived handoff.
        </p>
      </section>
    </AuthSplitLayout>
  );
}

export default async function DesktopAuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const query = await searchParams;
  const requestHeaders = new Headers(await headers());
  const currentRequest = createServerRequestFromHeaders(requestHeaders);
  const parsed = parseDesktopAuthRequest(
    new URLSearchParams({
      scheme: query.scheme ?? "",
      state: query.state ?? "",
      public_beta: query.public_beta ?? "",
    }),
  );

  if (!parsed.ok) {
    return <DesktopAuthError />;
  }

  const mode = query.mode === "sign-in" ? "sign-in" : "sign-up";
  const auth = await getAuth(currentRequest);
  if (!auth.userId) {
    const authPath = mode === "sign-in" ? "sign-in" : "sign-up";
    const returnUrl = buildCompletionPath(query);
    // Cookie-based i18n: no locale prefix — redirect to /sign-in or /sign-up directly.
    redirect(`/${authPath}?${new URLSearchParams({ returnUrl }).toString()}`);
  }

  const handoff = await issueDesktopAuthHandoff({
    client: db,
    userId: auth.userId,
    scheme: parsed.scheme,
    state: parsed.state,
    request: currentRequest,
  });

  return (
    <AuthSplitLayout>
      <DesktopAuthCompleteHandoff
        redirectUrl={buildDesktopRedirectUrl(parsed.scheme, handoff.token, parsed.state)}
        expiresAt={handoff.expiresAt.toISOString()}
      />
    </AuthSplitLayout>
  );
}

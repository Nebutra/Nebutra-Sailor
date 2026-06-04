import { issueDesktopAuthHandoff, parseDesktopAuthRequest } from "@nebutra/auth/desktop";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { DesktopAuthCompleteHandoff } from "@/components/auth/desktop-auth-complete-handoff";
import { createServerRequestFromHeaders, getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { locale: string };
type SearchParams = {
  scheme?: string;
  state?: string;
  mode?: "sign-in" | "sign-up";
  public_beta?: string;
};

function buildCompletionPath(locale: string, query: SearchParams): string {
  const params = new URLSearchParams();
  if (query.scheme) params.set("scheme", query.scheme);
  if (query.state) params.set("state", query.state);
  if (query.mode) params.set("mode", query.mode);
  if (query.public_beta) params.set("public_beta", query.public_beta);
  return `/${locale}/desktop-auth/complete?${params.toString()}`;
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
      <section className="rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-normal text-[var(--neutral-10)]">
          Desktop sign-in
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--neutral-12)]">
          This desktop sign-in link is invalid
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--neutral-10)]">
          Restart sign-in from Nebutra Foundry to create a fresh, short-lived handoff.
        </p>
      </section>
    </AuthSplitLayout>
  );
}

export default async function DesktopAuthCompletePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const [{ locale }, query] = await Promise.all([params, searchParams]);
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
    const returnUrl = buildCompletionPath(locale, query);
    redirect(`/${locale}/${authPath}?${new URLSearchParams({ returnUrl }).toString()}`);
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

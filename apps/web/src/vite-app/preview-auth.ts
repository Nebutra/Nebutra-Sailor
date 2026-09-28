import { resolveApiUrl } from "@/lib/api/browser-client";

/**
 * The demo account the local preview database seeds (packages/platform/db,
 * scripts/preview-db.mjs). Offered only while `pnpm dev` runs on that
 * database — it announces it in VITE_SAILOR_DEMO_ACCOUNT.
 */
export const DEMO_ACCOUNT = {
  email: "admin@example.com",
  password: "nebutra-preview",
} as const;

export const hasDemoAccount = (): boolean => Boolean(import.meta.env.VITE_SAILOR_DEMO_ACCOUNT);

/** POST to Better Auth through the app's /api proxy; resolves to an error message or null. */
export async function postAuth(path: string, body: Record<string, string>): Promise<string | null> {
  const response = await fetch(resolveApiUrl(`/api/auth/${path}`), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok) return null;
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? `The auth service answered ${response.status}`;
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function signInWithDemoAccount(): Promise<string | null> {
  return postAuth("sign-in/email", { ...DEMO_ACCOUNT }).catch(describeError);
}

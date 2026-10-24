/**
 * Unsubscribe by token. POST acts: it is the RFC 8058 one-click target
 * (`List-Unsubscribe=One-Click`) mail clients use. GET redirects to the styled
 * page, which asks before acting because mail scanners follow links.
 */
import { getDb } from "@/server/db";
import { unsubscribe } from "@/server/notify/outbox";
import { pageRedirect, resultPage } from "@/server/notify/pages";

export const runtime = "nodejs";

function tokenOf(request: Request, form?: FormData | null): string {
  const fromForm = form?.get("token");
  return (
    (typeof fromForm === "string" && fromForm) ||
    new URL(request.url).searchParams.get("token") ||
    ""
  );
}

export async function GET(request: Request) {
  return pageRedirect(request, "/subscriptions/unsubscribe");
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const ok = await unsubscribe(getDb(), tokenOf(request, form));
  return resultPage(request, ok ? "unsubscribed" : "invalid", ok ? 200 : 404);
}

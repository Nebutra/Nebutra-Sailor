/**
 * Unsubscribe by token. GET shows a button rather than acting, because mail
 * scanners follow links; POST acts — including RFC 8058 one-click
 * (`List-Unsubscribe=One-Click`) from mail clients.
 */
import { getDb } from "@/server/db";
import { unsubscribe } from "@/server/notify/outbox";
import { resultPage, unsubscribeForm } from "@/server/notify/pages";

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
  return unsubscribeForm(request, tokenOf(request));
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const ok = await unsubscribe(getDb(), tokenOf(request, form));
  return resultPage(request, ok ? "unsubscribed" : "invalid", ok ? 200 : 404);
}

/** The link in a confirmation email. */
import { getDb } from "@/server/db";
import { confirmSubscription } from "@/server/notify/outbox";
import { resultPage } from "@/server/notify/pages";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ok = await confirmSubscription(getDb(), token);
  return resultPage(request, ok ? "confirmed" : "invalid", ok ? 200 : 404);
}

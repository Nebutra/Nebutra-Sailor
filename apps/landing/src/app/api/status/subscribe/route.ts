import { requestSubscription, sendConfirmation, subscriberEmailSchema } from "@nebutra/status";
import { NextResponse } from "next/server";
import { statusMailContext } from "@/lib/status-mail";

/**
 * Start an email subscription. Always answers the same way for a valid
 * address — pending, throttled and already-subscribed look identical — so the
 * form cannot be used to learn who is subscribed.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = subscriberEmailSchema.safeParse((body as { email?: unknown })?.email);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 422 });
  }
  const result = await requestSubscription(parsed.data);
  if (result.kind === "pending") {
    await sendConfirmation(statusMailContext(), result.subscriber);
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}

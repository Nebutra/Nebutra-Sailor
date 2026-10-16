"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/server/db";
import { unsubscribe } from "@/server/notify/outbox";

/** A button, not a link, does the unsubscribing: mail scanners follow links. */
export async function unsubscribeAction(form: FormData): Promise<void> {
  const token = String(form.get("token") ?? "");
  const ok = await unsubscribe(getDb(), token);
  redirect(`/subscriptions/unsubscribe?token=${encodeURIComponent(token)}&done=${ok ? "1" : "0"}`);
}

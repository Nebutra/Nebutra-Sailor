import { loadNotificationSettingsSnapshot } from "@nebutra/notifications";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

// Snapshot for the in-shell Manus-style notifications modal. The route is
// minimal — pure read-through to the provider-agnostic snapshot loader.
export async function GET() {
  const { userId, orgId } = await getAuth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snapshot = await loadNotificationSettingsSnapshot({
    userId,
    tenantId: orgId,
    inboxLimit: 30,
  });
  return NextResponse.json({ snapshot });
}

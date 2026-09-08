import { getSessionFromRequest } from "@/lib/auth";
import { creditBalance, ensureWelcomeCredits, shootPriceCredits } from "@/lib/credits";
import { DbUnavailableError, tenantDbFor } from "@/lib/db";
import { log as appLog } from "@/lib/log";

export const runtime = "nodejs";

/**
 * What this person has, and what one shoot costs — so the studio can say both
 * before the button is pressed. Capability 1 of the roadmap: the balance is
 * visible, and the price is known before the action.
 *
 * Welcoming happens here too, so the very first visit to the studio already
 * shows the allowance rather than a zero that only fills in after a shoot.
 */
export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return Response.json({ error: "sign_in_required" }, { status: 401 });
  }

  const log = appLog.child({ route: "credits", userId: session.userId });
  try {
    const { tenant } = await tenantDbFor(session);
    const welcome = await ensureWelcomeCredits(tenant.tenantId);
    if (welcome.granted) log.info("welcome credits granted");
    const balance = await creditBalance(tenant.tenantId);
    return Response.json(
      { balance, price: shootPriceCredits() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    log.error("credits read failed", error);
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}

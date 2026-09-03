import { getSessionFromRequest } from "@/lib/auth";
import { consentGap, FACE_NOTICE, FACE_NOTICE_VERSION } from "@/lib/consent";
import { grantFaceConsent, readFaceConsent, withdrawFaceConsent } from "@/lib/consent.server";
import { log as appLog } from "@/lib/log";
import { InvalidResourceKeyError, ResourceStoreUnavailableError } from "@/lib/resources";

export const runtime = "nodejs";

function signInRequired() {
  return Response.json({ error: "sign_in_required" }, { status: 401 });
}

function unavailable(error: unknown) {
  if (error instanceof InvalidResourceKeyError) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (error instanceof ResourceStoreUnavailableError) {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
  return Response.json({ error: "unavailable" }, { status: 500 });
}

const noStore = { "Cache-Control": "no-store" } as const;

/** What this person has agreed to, and the notice they would be agreeing to. */
export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) return signInRequired();

  const log = appLog.child({ route: "consent/face", userId: session.userId });
  try {
    const record = await readFaceConsent(session.userId);
    return Response.json(
      {
        version: FACE_NOTICE_VERSION,
        notice: FACE_NOTICE,
        gap: consentGap(record),
        consentedAt: record?.consentGiven && !record.withdrawnAt ? record.consentedAt : null,
      },
      { headers: noStore },
    );
  } catch (error) {
    log.error("consent read failed", error);
    return unavailable(error);
  }
}

/** Accept the current notice. */
export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) return signInRequired();

  const log = appLog.child({ route: "consent/face", userId: session.userId });
  try {
    const record = await grantFaceConsent(session.userId, {
      consentContext: "shoot",
      // Behind Fly's proxy the client address is the leftmost forwarded hop.
      ipAddress: request.headers.get("fly-client-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    log.info("face consent granted", { version: record.documentVersion });
    return Response.json({ consentedAt: record.consentedAt }, { headers: noStore });
  } catch (error) {
    log.error("consent write failed", error);
    return unavailable(error);
  }
}

/** Take it back. Past Moments are untouched; those have their own delete. */
export async function DELETE(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) return signInRequired();

  const log = appLog.child({ route: "consent/face", userId: session.userId });
  try {
    const record = await withdrawFaceConsent(session.userId);
    log.info("face consent withdrawn", { hadRecord: Boolean(record) });
    return new Response(null, { status: 204, headers: noStore });
  } catch (error) {
    log.error("consent withdraw failed", error);
    return unavailable(error);
  }
}

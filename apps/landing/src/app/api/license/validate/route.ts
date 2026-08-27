import { validateLicense } from "@nebutra/license";
import { logger } from "@nebutra/logger";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "@/lib/license-bootstrap";

/**
 * GET /api/license/validate?key=<licenseKey>
 *
 * Public endpoint called by the Nebutra CLI during `nebutra license activate`.
 * Returns whether the key exists and is active — no authentication required
 * because the key itself (a cuid) is the credential.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");

  if (!key || key.length < 10) {
    return NextResponse.json({ valid: false, error: "Missing or malformed key" }, { status: 400 });
  }

  try {
    const result = await validateLicense(key);

    if (!result.valid && result.error === "License key not found") {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    if (!result.valid && result.error === "License has expired") {
      return NextResponse.json({ valid: false, error: result.error }, { status: 410 });
    }

    return NextResponse.json({ valid: true, tier: result.tier, type: result.type });
  } catch (error) {
    logger.error("[GET /api/license/validate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

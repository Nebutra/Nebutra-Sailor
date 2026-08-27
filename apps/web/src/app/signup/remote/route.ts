import { buildDesktopAuthStartUrl } from "@nebutra/auth/desktop";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return NextResponse.redirect(buildDesktopAuthStartUrl(request, "sign-up"), 307);
}

import type { NextRequest } from "next/server";
import { handleOIDC } from "@/lib/oidc-route";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handleOIDC(req);
}

export function POST(req: NextRequest) {
  return handleOIDC(req);
}

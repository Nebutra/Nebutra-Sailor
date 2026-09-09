import { nextHealthRoute } from "@nebutra/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fleet probe target — `HealthCheckResult` shape shared by every Next app. */
export const GET = nextHealthRoute({
  service: "forge",
  version: process.env.npm_package_version,
});

import { redirect } from "next/navigation";
import { resolveAuthenticatedHomePath } from "@/lib/authenticated-home-path";

// =============================================================================
// /workspace — stable post-login alias
// =============================================================================
// Product home converged into Startup OS when that prototype is on. Production
// keeps Startup OS private unless STARTUP_AGENT_OS_PROTOTYPE=1; in that case
// land on Connectors so login never 404s. Cookie-based i18n: no locale prefix.
// =============================================================================

export default async function WorkspacePage(): Promise<never> {
  redirect(resolveAuthenticatedHomePath());
}

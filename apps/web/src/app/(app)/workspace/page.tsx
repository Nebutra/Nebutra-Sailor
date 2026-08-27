import { redirect } from "next/navigation";

// =============================================================================
// /workspace — redirect to Startup OS (merge)
// =============================================================================
// The dashboard Home and Startup OS were duplicate prompt-first heroes. Home is
// converged into Startup OS, which is the prompt-first entry surface. This route
// now redirects to /startup-os. Cookie-based i18n: no locale prefix in the URL.
// =============================================================================

export default async function WorkspacePage(): Promise<never> {
  redirect("/startup-os");
}

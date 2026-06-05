import { redirect } from "next/navigation";

// =============================================================================
// /workspace — redirect to Startup OS (merge)
// =============================================================================
// The dashboard Home and Startup OS were duplicate prompt-first heroes. Home is
// converged into Startup OS, which is the prompt-first entry surface. This route
// now redirects to /startup-os, preserving the active locale prefix.
// =============================================================================

interface WorkspacePageProps {
  params: Promise<{ locale: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/startup-os`);
}

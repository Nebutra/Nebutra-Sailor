import { Suspense } from "react";
import { WorkspacePage } from "@/components/shell/workspace-page";

export default async function WorkspaceRoute({
  params,
}: {
  params: Promise<{ projectId: string; workspaceId: string }>;
}) {
  const { projectId, workspaceId } = await params;
  return (
    // Suspense: `?view=` is read with useSearchParams inside the shell
    <Suspense fallback={null}>
      <WorkspacePage projectId={projectId} workspaceId={workspaceId} />
    </Suspense>
  );
}

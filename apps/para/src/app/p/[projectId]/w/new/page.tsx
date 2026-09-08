import { NewWorkspace } from "@/components/shell/new-workspace";

/** Zero-step create (A): no name dialog; create and redirect straight into the canvas. */
export default async function NewWorkspaceRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <NewWorkspace projectId={projectId} />;
}

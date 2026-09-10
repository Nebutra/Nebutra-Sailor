"use client";

import { useEffect } from "react";
import { WorkspaceSurface } from "@/components/canvas/workspace-surface";
import { AgentPanel } from "@/components/overlays/agent-panel";
import { JobsDrawer } from "@/components/overlays/jobs-drawer";
import { LibraryDrawer } from "@/components/overlays/library-drawer";
import { api, useDocument, useProject, useWorkspace } from "@/mock/queries";
import { useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";
import { BottomDock } from "./bottom-dock";
import { useWorkspaceView } from "./view-selector";
import { WorkspaceTopBar } from "./workspace-top-bar";

/**
 * Workspace = TopBar + one Primary Surface + BottomDock + contextual overlays.
 * Drawers are flex siblings of the surface. No inspector: node config is anchored to the node (selection.md).
 * The document autosaves silently (A); selection and drawers are client-only.
 */
export function WorkspacePage({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const { data: project } = useProject(projectId);
  const { data: workspace, isLoading } = useWorkspace(projectId, workspaceId);
  const { data: doc } = useDocument(workspace?.documentId);
  const load = useEditorStore((s) => s.load);
  const loadedId = useEditorStore((s) => s.documentId);
  const dirty = useEditorStore((s) => s.dirty);
  const activeDrawer = useUiStore((s) => s.activeDrawer);
  const setDrawer = useUiStore((s) => s.setDrawer);
  const agentStatus = useUiStore((s) => s.agent.status);
  const [view] = useWorkspaceView();

  useEffect(() => {
    if (workspace && doc && loadedId !== workspace.documentId) load(workspace.documentId, doc);
  }, [workspace, doc, loadedId, load]);

  // Silent autosave, debounced.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      const { documentId, document } = useEditorStore.getState();
      if (documentId && document) void api.saveDocument(documentId, document);
    }, 600);
    return () => clearTimeout(t);
  }, [dirty]);

  // A prompt carried over from Home opens the composer once the workspace is up.
  useEffect(() => {
    if (agentStatus === "composing" && activeDrawer !== "agent") setDrawer("agent");
  }, [agentStatus, activeDrawer, setDrawer]);

  useEffect(() => () => useUiStore.getState().setDrawer(null), []);

  if (!isLoading && !workspace) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-body">
        This workspace does not exist.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <WorkspaceTopBar
        projectId={projectId}
        projectName={project?.name ?? ""}
        workspaceId={workspaceId}
        workspaceName={workspace?.name ?? ""}
      />
      <div className="flex min-h-0 flex-1">
        {activeDrawer === "library" && (
          <LibraryDrawer projectId={projectId} workspaceId={workspaceId} />
        )}
        <div className="relative min-w-0 flex-1">
          <WorkspaceSurface view={view} />
          <BottomDock />
          {activeDrawer === "agent" && <AgentPanel projectId={projectId} />}
        </div>
        {activeDrawer === "jobs" && <JobsDrawer />}
      </div>
    </div>
  );
}

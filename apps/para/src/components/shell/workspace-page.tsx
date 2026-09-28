"use client";

// @async-surface-exempt: this is the page shell that decides what to mount; the surfaces it mounts own their own states.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { WorkspaceSurface } from "@/components/canvas/workspace-surface";
import { AgentPanel } from "@/components/overlays/agent-panel";
import { JobsDrawer } from "@/components/overlays/jobs-drawer";
import { LibraryDrawer } from "@/components/overlays/library-drawer";
import { parseSeed, seedNode } from "@/domain/seed";
import { api, useDocument, useProject, useWorkspace } from "@/mock/queries";
import { nextId, useEditorStore } from "@/stores/editor-store";
import { useJobsStore } from "@/stores/jobs-store";
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
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const seed = parseSeed(params.get("seed"));
  const seeded = useRef(false);

  useEffect(() => {
    if (workspace && doc && loadedId !== workspace.documentId) {
      load(workspace.documentId, doc, projectId);
      // Node status is persisted; the jobs store is not. Without this, a reload during a
      // generation leaves the node reading "running" with nothing behind it, and no way back.
      void useJobsStore.getState().reconcile();
    }
  }, [workspace, doc, loadedId, load, projectId]);

  // `?seed=image|text` (Home tool tiles): one empty generator node, selected, prompt focused. Only
  // into an empty document, and the param is dropped afterwards so a reload never seeds twice.
  useEffect(() => {
    if (!seed || seeded.current || !workspace || loadedId !== workspace.documentId) return;
    seeded.current = true;
    const editor = useEditorStore.getState();
    if (editor.document && Object.keys(editor.document.nodes).length === 0) {
      const id = nextId();
      editor.addNode(
        seedNode(seed, id, editor.document.viewport, {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      );
      editor.select([id]);
      useUiStore.getState().setPromptFocus(id);
    }
    const rest = new URLSearchParams(params.toString());
    rest.delete("seed");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [seed, workspace, loadedId, params, pathname, router]);

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

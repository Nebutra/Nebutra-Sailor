"use client";

// @async-surface-exempt: this is the page shell that decides what to mount; the surfaces it mounts own their own states.

import { ReactFlowProvider } from "@xyflow/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { AddNodeMenu } from "@/components/canvas/add-node-menu";
import { WorkspaceSurface } from "@/components/canvas/workspace-surface";
import { AgentPanel } from "@/components/overlays/agent-panel";
import { AssetsPanel } from "@/components/overlays/assets-panel";
import { HistoryDialog } from "@/components/overlays/history-dialog";
import { parseSeed, seedNode } from "@/domain/seed";
import { parseTemplate } from "@/domain/templates";
import { api, useDocument, useWorkspace } from "@/mock/queries";
import { applyTemplate } from "@/stores/apply-template";
import { nextId, useEditorStore } from "@/stores/editor-store";
import { useJobsStore } from "@/stores/jobs-store";
import { useUiStore } from "@/stores/ui-store";
import { BottomDock } from "./bottom-dock";
import { useWorkspaceView } from "./view-selector";
import { WorkspaceTopBar } from "./workspace-top-bar";

const AUTOSAVE_MS = 600;

/**
 * The canvas workspace, laid out as LibTV's: 资产管理 on the left, the canvas with its floating top
 * bar and dock in the middle, the Agent drawer on the right — any combination open at once.
 * The document autosaves (待同步 → 同步中 → 已同步); selection and panels are client-only.
 */
export function WorkspacePage({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const { data: workspace, isLoading } = useWorkspace(projectId, workspaceId);
  const { data: doc } = useDocument(workspace?.documentId);
  const load = useEditorStore((s) => s.load);
  const loadedId = useEditorStore((s) => s.documentId);
  const dirty = useEditorStore((s) => s.dirty);
  const assetsOpen = useUiStore((s) => s.assetsOpen);
  const agentOpen = useUiStore((s) => s.agentOpen);
  const setAgentOpen = useUiStore((s) => s.setAgentOpen);
  const agentStatus = useUiStore((s) => s.agent.status);
  const [view] = useWorkspaceView();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const seed = parseSeed(params.get("seed"));
  const template = parseTemplate(params.get("template"));
  const started = useRef(false);

  useEffect(() => {
    if (workspace && doc && loadedId !== workspace.documentId) {
      load(workspace.documentId, doc, projectId);
      // Node status is persisted; the jobs store is not. Without this, a reload during a
      // generation leaves the node reading "running" with nothing behind it, and no way back.
      void useJobsStore.getState().reconcile();
    }
  }, [workspace, doc, loadedId, load, projectId]);

  // `?template=<id>` (Home template tiles) builds a small graph; `?seed=image|text` (Home tool
  // tiles) one empty generator node. Only into an empty document, and the param is dropped
  // afterwards so a reload never builds twice. The canvas has to be mounted first so the graph is
  // centred on what the stage actually shows.
  useEffect(() => {
    if ((!seed && !template) || started.current) return;
    if (!workspace || loadedId !== workspace.documentId) return;
    started.current = true;
    const run = () => {
      const editor = useEditorStore.getState();
      const empty = editor.document && Object.keys(editor.document.nodes).length === 0;
      if (empty && template) applyTemplate(template);
      else if (empty && seed && editor.document) {
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
      rest.delete("template");
      const query = rest.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };
    requestAnimationFrame(run);
  }, [seed, template, workspace, loadedId, params, pathname, router]);

  // Autosave, debounced. The sync pill reads the store: pending on change, saving while the PUT
  // (If-Match on the document version, lib/gateway-api) is in flight, saved when it lands with
  // nothing newer behind it.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      const { documentId, document, beginSave, endSave } = useEditorStore.getState();
      if (!documentId || !document) return;
      const at = beginSave();
      api.saveDocument(documentId, document).then(
        () => useEditorStore.getState().endSave(true, at),
        () => endSave(false, at),
      );
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty]);

  // A prompt carried over from Home opens the composer once, when the workspace comes up. Only
  // once: the drawer is the user's to close afterwards, and a composing draft must not reopen it.
  const carried = useRef(false);
  useEffect(() => {
    if (carried.current) return;
    carried.current = true;
    if (agentStatus === "composing" && !agentOpen) setAgentOpen(true);
  }, [agentStatus, agentOpen, setAgentOpen]);

  useCanvasKeys(view === "canvas");

  useEffect(() => () => useUiStore.getState().closeAll(), []);

  if (!isLoading && !workspace) {
    return (
      <div className="flex h-full items-center justify-center text-body text-muted-foreground">
        这个画布不存在，或者你没有访问权限。
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-full bg-background">
        {assetsOpen && view === "canvas" && <AssetsPanel projectId={projectId} />}
        <div className="relative min-w-0 flex-1">
          <WorkspaceSurface view={view} />
          <WorkspaceTopBar projectId={projectId} workspaceId={workspaceId} />
          {view === "canvas" && <BottomDock />}
        </div>
        {agentOpen && <AgentPanel projectId={projectId} />}
      </div>
      <AddNodeMenu />
      <HistoryDialog projectId={projectId} workspaceId={workspaceId} />
    </ReactFlowProvider>
  );
}

/** V / H switch tools, holding Space pans, ⌘D duplicates, Esc clears. Ignored while typing. */
function useCanvasKeys(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return Boolean(
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable),
      );
    };
    let spaceFrom: "select" | "hand" | null = null;
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const ui = useUiStore.getState();
      const editor = useEditorStore.getState();
      if (e.key === " " && !spaceFrom) {
        spaceFrom = ui.tool;
        ui.setTool("hand");
        e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === "d" && editor.selection.length === 1 && editor.selection[0]) {
          e.preventDefault();
          editor.duplicateNode(editor.selection[0]);
        }
        return;
      }
      if (e.key === "v" || e.key === "V") ui.setTool("select");
      if (e.key === "h" || e.key === "H") ui.setTool("hand");
      if (e.key === "Escape") {
        if (ui.addMenu) ui.closeAddMenu();
        else if (editor.selection.length) editor.select([]);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === " " && spaceFrom) {
        useUiStore.getState().setTool(spaceFrom);
        spaceFrom = null;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [active]);
}

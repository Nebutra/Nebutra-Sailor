"use client";

/**
 * The workspace app shell — a fixed full-height frame that never scrolls.
 *
 * Two columns on one `neutral-2` chrome: the conversational thread on the left,
 * and on the right a surface card (`neutral-1`, rounded, ambient elevation) that
 * holds whichever working surface the tabs select. The gap between them plus the
 * one-step tonal shift is the separation — there are no rules between regions.
 * Only the inner panels scroll, inside their own `min-h-0` containers.
 */

import { Code, Layers, PreviewEye } from "@nebutra/icons";
import type { StartupCanvasLayout } from "@nebutra/startup-os/canvas";
import type {
  StartupArtifact,
  StartupOperatingRun,
  StartupOSProject,
} from "@nebutra/startup-os/compiler";
import type { StartupOSFile } from "@nebutra/startup-os/files";
import { AnimateIn } from "@nebutra/ui/components";
import { Tabs, TabsList, TabsTrigger } from "@nebutra/ui/primitives";
import { useState } from "react";
import { useSidebar } from "@/components/navigation/sidebar-context";
import { StartupCanvasPanel } from "./startup-canvas-panel";
import { StartupThreadPanel } from "./startup-thread-panel";
import { StartupWorkspaceFilesPanel } from "./startup-workspace-files-panel";
import type { UseStartupConversationResult } from "./use-startup-conversation";

type WorkspaceSurface = "preview" | "code" | "canvas";

export interface StartupWorkspaceShellProps {
  readonly activityCount: number;
  readonly canvasLayout: StartupCanvasLayout | null;
  /** Injectable conversation state for the thread column — see StartupThreadPanel. */
  readonly conversation?: UseStartupConversationResult;
  readonly files: readonly StartupOSFile[];
  readonly isApproving: boolean;
  readonly isExecuting: boolean;
  readonly isSavingFile: boolean;
  readonly onApprove: () => void;
  readonly onChatApplied: () => void;
  readonly onExecuteRun: (runId?: string) => void;
  readonly onPersistLayout: (layout: StartupCanvasLayout) => Promise<void>;
  readonly onSaveFile: (path: string, content: string) => Promise<void>;
  readonly onSelectArtifact: (artifactId: string) => void;
  readonly onSelectFile: (path: string) => void;
  readonly onSelectProject: (project: StartupOSProject) => void;
  readonly onSelectRun: (runId: string) => void;
  readonly previewHtml: string;
  readonly project: StartupOSProject;
  readonly projects: readonly StartupOSProject[];
  readonly selectedArtifact: StartupArtifact | null;
  readonly selectedFile: StartupOSFile | null;
  readonly selectedRun: StartupOperatingRun | null;
}

export function StartupWorkspaceShell({
  activityCount,
  canvasLayout,
  conversation,
  files,
  isApproving,
  isExecuting,
  isSavingFile,
  onApprove,
  onChatApplied,
  onExecuteRun,
  onPersistLayout,
  onSaveFile,
  onSelectArtifact,
  onSelectFile,
  onSelectProject,
  onSelectRun,
  previewHtml,
  project,
  projects,
  selectedArtifact,
  selectedFile,
  selectedRun,
}: StartupWorkspaceShellProps) {
  // Chat is not a separate surface — it lives in the thread column. The tabs
  // switch only the working surface.
  const [activeSurface, setActiveSurface] = useState<WorkspaceSurface>("preview");
  // The dashboard sidebar is hidden on startup-os; the thread-column logo button
  // drives the same collapse toggle.
  const { toggle: toggleSidebar } = useSidebar();
  const isFilesSurface = activeSurface === "code" || activeSurface === "preview";

  return (
    <AnimateIn preset="fadeUp" className="h-[100dvh] min-h-0">
      {/* Fixed full-height app shell: the workspace is exactly the viewport, so
 the OUTER container never scrolls. `h-full` percentage doesn't resolve
 through AppShell's overflow-y-auto block <main>, so the dynamic-viewport
 height is pinned here instead. */}
      <section className="h-[100dvh] min-h-0 overflow-hidden bg-neutral-2 text-neutral-12">
        <div className="grid h-full min-h-0 xl:grid-cols-[360px_minmax(0,1fr)]">
          <StartupThreadPanel
            activityCount={activityCount}
            conversation={conversation}
            isApproving={isApproving}
            isExecuting={isExecuting}
            onApprove={onApprove}
            onChatApplied={onChatApplied}
            onExecuteRun={onExecuteRun}
            onSelectProject={onSelectProject}
            onToggleNav={toggleSidebar}
            project={project}
            projects={projects}
            selectedRun={selectedRun}
          />

          {/* The gutter is the separator: 12px of `neutral-2` chrome on every
 side of the surface card, so the thread column and the working surface
 never share an edge and never need a rule between them. */}
          <main className="flex min-h-0 min-w-0 flex-col px-3 pb-3">
            <div className="flex h-14 shrink-0 items-center justify-end gap-3">
              <Tabs
                value={activeSurface}
                onValueChange={(value) => setActiveSurface(value as WorkspaceSurface)}
                shape="pill"
              >
                <TabsList>
                  <TabsTrigger
                    value="preview"
                    icon={<PreviewEye className="size-3.5" aria-hidden="true" />}
                  >
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="code" icon={<Code className="size-3.5" aria-hidden="true" />}>
                    Code
                  </TabsTrigger>
                  <TabsTrigger
                    value="canvas"
                    icon={<Layers className="size-3.5" aria-hidden="true" />}
                  >
                    Canvas
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* The surface card. Both surfaces stay mounted so switching tabs
 never re-runs their fetch-free derivations or loses scroll position. */}
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl bg-neutral-1 shadow-ambient-sm">
              <div className={isFilesSurface ? "h-full min-h-0" : "hidden"}>
                <StartupWorkspaceFilesPanel
                  view={activeSurface === "preview" ? "preview" : "code"}
                  files={files}
                  isSavingFile={isSavingFile}
                  onSaveFile={onSaveFile}
                  onSelectFile={onSelectFile}
                  previewHtml={previewHtml}
                  selectedFile={selectedFile}
                />
              </div>

              <div className={activeSurface === "canvas" ? "h-full min-h-0" : "hidden"}>
                <StartupCanvasPanel
                  canvasLayout={canvasLayout}
                  isExecuting={isExecuting}
                  onExecuteRun={onExecuteRun}
                  onPersistLayout={onPersistLayout}
                  onSelectArtifact={onSelectArtifact}
                  onSelectRun={onSelectRun}
                  project={project}
                  selectedArtifactId={selectedArtifact?.id ?? null}
                  selectedRun={selectedRun}
                />
              </div>
            </div>
          </main>
        </div>
      </section>
    </AnimateIn>
  );
}

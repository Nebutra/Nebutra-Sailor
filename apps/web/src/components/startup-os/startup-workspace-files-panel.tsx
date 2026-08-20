"use client";

/**
 * The Code and Preview working surfaces.
 *
 * Code = a recessed file rail plus the read-only source view, with the open
 * files as a `Tabs` strip that scrolls horizontally rather than wrapping.
 * Preview = the generated app in a sandboxed iframe. Both fill the surface card
 * exactly; every long region scrolls inside its own `min-h-0` container so the
 * page body never scrolls.
 */

import { FolderClosed, PreviewEye } from "@nebutra/icons";
import { buildStartupPreviewHtml, type StartupOSFile } from "@nebutra/startup-os/files";
import { AnimateIn } from "@nebutra/ui/components";
import {
  CodeBlockLanguageIcon,
  EmptyState,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@nebutra/ui/primitives";
import { useDeferredValue, useEffect, useState } from "react";
import { StartupOsCodeView } from "./startup-os-code-view";
import { StartupOsFileTree } from "./startup-os-file-tree";
import { buildStartupExplorerTree, getStartupExplorerExpandedIds } from "./startup-os-model";

export interface StartupWorkspaceFilesPanelProps {
  readonly view: "code" | "preview";
  readonly files: readonly StartupOSFile[];
  readonly isSavingFile: boolean;
  readonly onSaveFile: (path: string, content: string) => Promise<void>;
  readonly onSelectFile: (path: string) => void;
  readonly previewHtml: string;
  readonly selectedFile: StartupOSFile | null;
}

export function StartupWorkspaceFilesPanel({
  view,
  files,
  isSavingFile,
  onSaveFile,
  onSelectFile,
  previewHtml,
  selectedFile,
}: StartupWorkspaceFilesPanelProps) {
  const [draftContent, setDraftContent] = useState(selectedFile?.content ?? "");
  const deferredDraftContent = useDeferredValue(draftContent);
  const tree = buildStartupExplorerTree(files);
  const expandedIds = getStartupExplorerExpandedIds(files);

  useEffect(() => {
    setDraftContent(selectedFile?.content ?? "");
  }, [selectedFile?.content]);

  const previewFiles = selectedFile
    ? files.map((file) =>
        file.path === selectedFile.path ? { ...file, content: deferredDraftContent } : file,
      )
    : files;
  const livePreviewHtml =
    previewFiles.length > 0 ? buildStartupPreviewHtml(previewFiles) : previewHtml;

  return (
    <AnimateIn preset="fadeUp" className="h-full min-h-0">
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-1">
        <div
          className={`grid min-h-0 flex-1 ${
            view === "code" ? "xl:grid-cols-[260px_minmax(0,1fr)]" : "grid-cols-1"
          }`}
        >
          <aside
            className={`min-h-0 min-w-0 flex-col bg-neutral-2 ${view === "code" ? "flex" : "hidden"}`}
          >
            <p className="shrink-0 px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-10">
              Files
            </p>
            <div className="min-h-0 flex-1 overflow-auto px-2 pb-3">
              <StartupOsFileTree
                defaultExpandedIds={expandedIds}
                nodes={tree}
                onSelect={onSelectFile}
                selectedPath={selectedFile?.path ?? null}
                treeKey={files.map((file) => file.path).join("|")}
              />
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className={view === "code" ? "flex min-h-0 min-w-0 flex-1 flex-col" : "hidden"}>
              <StartupOpenFileTabs
                files={files}
                onSelectFile={onSelectFile}
                selectedPath={selectedFile?.path ?? null}
              />
              {selectedFile ? (
                <StartupOsCodeView
                  file={selectedFile}
                  isSaving={isSavingFile}
                  onSave={(content) => onSaveFile(selectedFile.path, content)}
                />
              ) : (
                <div className="grid min-h-0 flex-1 place-items-center p-8">
                  <EmptyState.Root
                    className="border-0 bg-transparent"
                    icon={<EmptyState.Icon icon={<FolderClosed className="size-5" />} />}
                    size="sm"
                    title="Pick a file"
                    description="Choose a file from the rail to read its generated source."
                  />
                </div>
              )}
            </div>

            <div
              className={
                view === "preview" ? "flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-2" : "hidden"
              }
            >
              {livePreviewHtml ? (
                <iframe
                  title="Startup OS generated app preview"
                  sandbox=""
                  srcDoc={livePreviewHtml}
                  className="min-h-0 flex-1 border-0 bg-white"
                />
              ) : (
                <div className="grid min-h-0 flex-1 place-items-center p-8">
                  <EmptyState.Root
                    className="border-0 bg-transparent"
                    icon={<EmptyState.Icon icon={<PreviewEye className="size-5" />} />}
                    size="sm"
                    title="Nothing to preview"
                    description="The preview renders as soon as this project generates its first files."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </AnimateIn>
  );
}

/**
 * Open files as a horizontal `Tabs` strip. The list scrolls in place — a long
 * scaffold must never widen the workspace or wrap into a second row that shifts
 * the editor down.
 */
function StartupOpenFileTabs({
  files,
  onSelectFile,
  selectedPath,
}: {
  files: readonly StartupOSFile[];
  onSelectFile: (path: string) => void;
  selectedPath: string | null;
}) {
  if (files.length === 0) return null;

  return (
    <Tabs
      value={selectedPath ?? ""}
      onValueChange={(value) => onSelectFile(value)}
      variant="secondary"
      shape="pill"
      className="min-w-0 shrink-0 px-2 pt-2"
    >
      <TabsList className="w-full max-w-full justify-start bg-transparent">
        {files.map((file) => (
          <TabsTrigger
            key={file.path}
            value={file.path}
            icon={<CodeBlockLanguageIcon language={file.language} className="size-3.5" />}
          >
            {file.path}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

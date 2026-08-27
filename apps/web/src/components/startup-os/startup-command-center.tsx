"use client";

/**
 * Startup OS command center — the stateful container.
 *
 * This module owns project state and every call to the Startup OS API; it
 * renders no chrome of its own beyond the error toast. The surfaces live in
 * sibling modules: `startup-builder-home` (no project yet) and
 * `startup-workspace-shell` (thread + preview/code/canvas). Payload shapes,
 * guards and helpers live in `startup-os-model`.
 */

import type { StartupCanvasLayout } from "@nebutra/startup-os/canvas";
import type { StartupArena, StartupOSProject } from "@nebutra/startup-os/compiler";
import { buildStartupPreviewHtml, type StartupOSFile } from "@nebutra/startup-os/files";
import { Badge } from "@nebutra/ui/primitives";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { StartupBuilderHome } from "./startup-builder-home";
import { setStartupChromeMode } from "./startup-chrome-store";
import {
  DEFAULT_THESIS,
  extractActivityEvents,
  type FilesResponse,
  fetchStartupApi,
  getFirstExecutableRunId,
  isExecutableRun,
  isStartupFile,
  isStartupProject,
  mergeProjectList,
  PROJECTS_ENDPOINT,
  type ProjectResponse,
  type ProjectsResponse,
  readApiJson,
  type StartupActivityEvent,
} from "./startup-os-model";
import { StartupWorkspaceShell } from "./startup-workspace-shell";

/** The file the editor opens by default when a project's files load. */
const ENTRY_FILE_PATH = "src/routes/index.tsx";

export function StartupCommandCenter() {
  const [projects, setProjects] = useState<StartupOSProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [thesis, setThesis] = useState(DEFAULT_THESIS);
  const [arena, setArena] = useState<StartupArena>("Developer infrastructure");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isExecutingRun, setIsExecutingRun] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [activityEvents, setActivityEvents] = useState<StartupActivityEvent[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedExecutionRunId, setSelectedExecutionRunId] = useState<string | null>(null);
  const [selectedCanvasRunId, setSelectedCanvasRunId] = useState<string | null>(null);
  const [workspaceFilesByProject, setWorkspaceFilesByProject] = useState<
    Record<string, readonly StartupOSFile[]>
  >({});
  const [previewHtmlByProject, setPreviewHtmlByProject] = useState<Record<string, string>>({});
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [canvasLayouts, setCanvasLayouts] = useState<Record<string, StartupCanvasLayout>>({});
  const detailRequestSeq = useRef(0);
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;
  // Publish chrome mode to the design-system shell: home (no project) keeps the
  // full dashboard nav; the workspace (project selected) hides/overlays it.
  const inWorkspace = selectedProject !== null;
  useEffect(() => {
    setStartupChromeMode(inWorkspace ? "workspace" : "home");
    return () => setStartupChromeMode("home");
  }, [inWorkspace]);
  const selectedArtifact =
    selectedProject?.artifacts.find((artifact) => artifact.id === selectedArtifactId) ??
    selectedProject?.artifacts[0] ??
    null;
  const executablePlannedRuns = (selectedProject?.runs ?? []).filter(isExecutableRun);
  const selectedExecutionRun =
    executablePlannedRuns.find((run) => run.id === selectedExecutionRunId) ??
    executablePlannedRuns[0] ??
    null;
  const selectedCanvasRun =
    selectedProject?.runs.find((run) => run.id === selectedCanvasRunId) ??
    selectedExecutionRun ??
    selectedProject?.runs[0] ??
    null;
  const selectedCanvasLayout = selectedProject ? (canvasLayouts[selectedProject.id] ?? null) : null;
  const selectedWorkspaceFiles = selectedProject
    ? (workspaceFilesByProject[selectedProject.id] ?? [])
    : [];
  const selectedFile =
    selectedWorkspaceFiles.find((file) => file.path === selectedFilePath) ??
    selectedWorkspaceFiles.find((file) => file.path === ENTRY_FILE_PATH) ??
    selectedWorkspaceFiles[0] ??
    null;
  const selectedPreviewHtml = selectedProject
    ? (previewHtmlByProject[selectedProject.id] ??
      (selectedWorkspaceFiles.length > 0 ? buildStartupPreviewHtml(selectedWorkspaceFiles) : ""))
    : "";

  function applyWorkspaceFiles(
    projectId: string,
    files: readonly StartupOSFile[],
    previewHtml?: string,
  ) {
    const nextFiles = files.filter(isStartupFile);
    if (nextFiles.length === 0) return;
    setWorkspaceFilesByProject((current) => ({
      ...current,
      [projectId]: nextFiles,
    }));
    setPreviewHtmlByProject((current) => ({
      ...current,
      [projectId]: previewHtml ?? buildStartupPreviewHtml(nextFiles),
    }));
    setSelectedFilePath((current) =>
      current && nextFiles.some((file) => file.path === current)
        ? current
        : (nextFiles.find((file) => file.path === ENTRY_FILE_PATH)?.path ??
          nextFiles[0]?.path ??
          null),
    );
  }

  async function loadProjectFiles(projectId: string) {
    setLastError(null);
    try {
      const payload = await readApiJson<FilesResponse>(
        await fetchStartupApi(`${PROJECTS_ENDPOINT}/${encodeURIComponent(projectId)}/files`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }),
      );
      if (!isStartupProject(payload.project) || !Array.isArray(payload.files)) {
        setLastError("Startup OS file API returned an invalid payload.");
        return;
      }
      setProjects((current) => mergeProjectList(current, payload.project));
      applyWorkspaceFiles(payload.project.id, payload.files, payload.previewHtml);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Failed to load Startup OS files.");
    }
  }

  async function loadProjectRecord(projectId: string) {
    const requestSeq = ++detailRequestSeq.current;
    setLastError(null);
    try {
      const payload = await readApiJson<ProjectResponse>(
        await fetchStartupApi(`${PROJECTS_ENDPOINT}/${encodeURIComponent(projectId)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }),
      );
      if (requestSeq !== detailRequestSeq.current) return;
      if (!isStartupProject(payload.project)) {
        setLastError("Startup OS API returned an invalid project payload.");
        return;
      }

      setProjects((current) => mergeProjectList(current, payload.project));
      if (payload.files) {
        applyWorkspaceFiles(payload.project.id, payload.files, payload.previewHtml);
      } else {
        void loadProjectFiles(payload.project.id);
      }
      if (payload.canvasLayout) {
        setCanvasLayouts((current) => ({
          ...current,
          [payload.project.id]: payload.canvasLayout as StartupCanvasLayout,
        }));
      }
      setSelectedProjectId(payload.project.id);
      setSelectedArtifactId((current) =>
        current && payload.project.artifacts.some((artifact) => artifact.id === current)
          ? current
          : (payload.project.artifacts[0]?.id ?? null),
      );
      setActivityEvents(extractActivityEvents(payload));
      setThesis(payload.project.thesis);
      setArena(payload.project.arena);
    } catch (error) {
      if (requestSeq === detailRequestSeq.current) {
        setLastError(error instanceof Error ? error.message : "Failed to load Startup OS project.");
      }
    }
  }
  const loadProjectRecordFromEffect = useEffectEvent((projectId: string) => {
    void loadProjectRecord(projectId);
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setIsLoading(true);
      setLastError(null);
      try {
        const payload = await readApiJson<ProjectsResponse>(
          await fetchStartupApi(PROJECTS_ENDPOINT, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
        );
        if (cancelled) return;

        const nextProjects = payload.projects.filter(isStartupProject);
        const firstProject = nextProjects[0] ?? null;
        setProjects([...nextProjects]);
        setCanvasLayouts({});
        setWorkspaceFilesByProject({});
        setPreviewHtmlByProject({});
        setSelectedProjectId(firstProject?.id ?? null);
        setSelectedArtifactId(firstProject?.artifacts[0]?.id ?? null);
        setSelectedFilePath(null);
        setActivityEvents(extractActivityEvents(payload));
        if (firstProject) {
          setThesis(firstProject.thesis);
          setArena(firstProject.arena);
          loadProjectRecordFromEffect(firstProject.id);
        }
      } catch (error) {
        if (!cancelled) {
          setLastError(error instanceof Error ? error.message : "Failed to load Startup OS.");
        }
      }
      if (!cancelled) setIsLoading(false);
    }

    void loadProjects();
    return () => {
      cancelled = true;
      detailRequestSeq.current += 1;
    };
  }, []);

  const canCompileProject =
    thesis.trim().length >= 8 && !isLoading && !isSaving && !isApproving && !isExecutingRun;

  async function requestRunExecution(runId = selectedExecutionRun?.id ?? null) {
    if (!selectedProject || !runId) return;

    setIsExecutingRun(true);
    setLastError(null);
    try {
      const payload = await readApiJson<ProjectResponse>(
        await fetchStartupApi(
          `${PROJECTS_ENDPOINT}/${encodeURIComponent(selectedProject.id)}/runs/${encodeURIComponent(
            runId,
          )}/execute`,
          {
            method: "POST",
            headers: { Accept: "application/json" },
          },
        ),
      );
      if (!isStartupProject(payload.project)) {
        setLastError("Startup OS API returned an invalid project payload.");
        setIsExecutingRun(false);
        return;
      }

      setProjects((current) => mergeProjectList(current, payload.project));
      if (payload.files) {
        applyWorkspaceFiles(payload.project.id, payload.files, payload.previewHtml);
      }
      if (payload.canvasLayout) {
        setCanvasLayouts((current) => ({
          ...current,
          [payload.project.id]: payload.canvasLayout as StartupCanvasLayout,
        }));
      }
      setSelectedProjectId(payload.project.id);
      setSelectedArtifactId((current) =>
        current && payload.project.artifacts.some((artifact) => artifact.id === current)
          ? current
          : (payload.project.artifacts[0]?.id ?? null),
      );
      setSelectedExecutionRunId((current) =>
        current && payload.project.runs.some((run) => run.id === current)
          ? current
          : getFirstExecutableRunId(payload.project.runs),
      );
      setSelectedCanvasRunId((current) =>
        current && payload.project.runs.some((run) => run.id === current)
          ? current
          : (payload.project.runs.find((run) => run.id === runId)?.id ?? null),
      );
      setActivityEvents(extractActivityEvents(payload));
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Failed to start real execution.");
    }
    setIsExecutingRun(false);
  }

  async function compileProject() {
    if (!canCompileProject) return;

    detailRequestSeq.current += 1;
    setIsSaving(true);
    setLastError(null);
    try {
      const payload = await readApiJson<ProjectResponse>(
        await fetchStartupApi(PROJECTS_ENDPOINT, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ thesis, arena }),
        }),
      );
      if (!isStartupProject(payload.project)) {
        setLastError("Startup OS API returned an invalid project payload.");
        setIsSaving(false);
        return;
      }

      setProjects((current) => mergeProjectList(current, payload.project));
      if (payload.files) {
        applyWorkspaceFiles(payload.project.id, payload.files, payload.previewHtml);
      } else {
        void loadProjectFiles(payload.project.id);
      }
      if (payload.canvasLayout) {
        setCanvasLayouts((current) => ({
          ...current,
          [payload.project.id]: payload.canvasLayout as StartupCanvasLayout,
        }));
      }
      setSelectedProjectId(payload.project.id);
      setSelectedArtifactId(payload.project.artifacts[0]?.id ?? null);
      setSelectedExecutionRunId(getFirstExecutableRunId(payload.project.runs));
      setSelectedCanvasRunId(getFirstExecutableRunId(payload.project.runs) ?? null);
      setActivityEvents(extractActivityEvents(payload));
      setThesis(payload.project.thesis);
      setArena(payload.project.arena);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Failed to compile Startup OS.");
    }
    setIsSaving(false);
  }

  function selectProject(project: StartupOSProject) {
    setSelectedProjectId(project.id);
    setSelectedArtifactId(project.artifacts[0]?.id ?? null);
    setSelectedExecutionRunId(getFirstExecutableRunId(project.runs));
    setSelectedCanvasRunId(getFirstExecutableRunId(project.runs) ?? project.runs[0]?.id ?? null);
    setSelectedFilePath(null);
    setActivityEvents([]);
    setThesis(project.thesis);
    setArena(project.arena);
    void loadProjectRecord(project.id);
  }

  async function approveReviewGate() {
    if (!selectedProject || isApproving) return;

    detailRequestSeq.current += 1;
    setIsApproving(true);
    setLastError(null);
    try {
      const payload = await readApiJson<ProjectResponse>(
        await fetchStartupApi(
          `${PROJECTS_ENDPOINT}/${encodeURIComponent(selectedProject.id)}/review`,
          {
            method: "POST",
            headers: { Accept: "application/json" },
          },
        ),
      );
      if (!isStartupProject(payload.project)) {
        setLastError("Startup OS API returned an invalid project payload.");
        setIsApproving(false);
        return;
      }

      setProjects((current) => mergeProjectList(current, payload.project));
      if (payload.files) {
        applyWorkspaceFiles(payload.project.id, payload.files, payload.previewHtml);
      }
      setSelectedProjectId(payload.project.id);
      setSelectedExecutionRunId((current) =>
        current && payload.project.runs.some((run) => run.id === current)
          ? current
          : getFirstExecutableRunId(payload.project.runs),
      );
      setSelectedCanvasRunId((current) =>
        current && payload.project.runs.some((run) => run.id === current)
          ? current
          : (getFirstExecutableRunId(payload.project.runs) ?? payload.project.runs[0]?.id ?? null),
      );
      setActivityEvents(extractActivityEvents(payload));
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Failed to approve review gate.");
    }
    setIsApproving(false);
  }

  async function persistCanvasLayout(projectId: string, layout: StartupCanvasLayout) {
    setLastError(null);
    try {
      const payload = await readApiJson<ProjectResponse>(
        await fetchStartupApi(`${PROJECTS_ENDPOINT}/${encodeURIComponent(projectId)}/canvas`, {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(layout),
        }),
      );
      if (!isStartupProject(payload.project)) {
        setLastError("Startup OS API returned an invalid project payload.");
        return;
      }
      if (!payload.canvasLayout) {
        setLastError("Startup OS API did not return the saved canvas layout.");
        return;
      }

      setProjects((current) => mergeProjectList(current, payload.project));
      if (payload.files) {
        applyWorkspaceFiles(payload.project.id, payload.files, payload.previewHtml);
      }
      setCanvasLayouts((current) => ({
        ...current,
        [payload.project.id]: payload.canvasLayout as StartupCanvasLayout,
      }));
      setActivityEvents(extractActivityEvents(payload));
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Failed to save canvas layout.");
    }
  }

  async function saveWorkspaceFile(path: string, content: string) {
    if (!selectedProject || isSavingFile) return;

    setIsSavingFile(true);
    setLastError(null);
    try {
      const payload = await readApiJson<ProjectResponse & FilesResponse>(
        await fetchStartupApi(
          `${PROJECTS_ENDPOINT}/${encodeURIComponent(selectedProject.id)}/files`,
          {
            method: "PATCH",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path, content }),
          },
        ),
      );
      if (!isStartupProject(payload.project) || !Array.isArray(payload.files)) {
        setLastError("Startup OS file API returned an invalid payload.");
        setIsSavingFile(false);
        return;
      }

      setProjects((current) => mergeProjectList(current, payload.project));
      applyWorkspaceFiles(payload.project.id, payload.files, payload.previewHtml);
      setActivityEvents(extractActivityEvents(payload));
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Failed to save Startup OS file.");
    }
    setIsSavingFile(false);
  }

  return (
    <div className="relative h-[100dvh] min-h-0 overflow-hidden">
      {lastError ? (
        <Badge
          variant="destructive"
          size="md"
          role="alert"
          className="absolute left-4 top-4 z-20 max-w-[min(28rem,calc(100%-2rem))] shadow-sm"
        >
          <span className="truncate">{lastError}</span>
        </Badge>
      ) : null}

      {!selectedProject ? (
        <StartupBuilderHome
          arena={arena}
          canCompile={canCompileProject}
          disabled={isSaving || isApproving || isExecutingRun}
          isLoading={isLoading}
          isSaving={isSaving}
          onArenaChange={setArena}
          onCompile={compileProject}
          onProjectSelect={selectProject}
          projects={projects}
          selectedProjectId={null}
          thesis={thesis}
          onThesisChange={setThesis}
        />
      ) : (
        <div className="h-full min-h-0">
          <StartupWorkspaceShell
            activityCount={activityEvents.length}
            canvasLayout={selectedCanvasLayout}
            files={selectedWorkspaceFiles}
            isApproving={isApproving}
            isExecuting={isExecutingRun}
            isSavingFile={isSavingFile}
            onApprove={approveReviewGate}
            onChatApplied={() => void loadProjectFiles(selectedProject.id)}
            onExecuteRun={requestRunExecution}
            onPersistLayout={(layout) => persistCanvasLayout(selectedProject.id, layout)}
            onSaveFile={saveWorkspaceFile}
            onSelectArtifact={setSelectedArtifactId}
            onSelectFile={setSelectedFilePath}
            onSelectProject={selectProject}
            onSelectRun={(runId) => {
              const run = selectedProject.runs.find((item) => item.id === runId);
              setSelectedCanvasRunId(runId);
              if (run && isExecutableRun(run)) {
                setSelectedExecutionRunId(runId);
              }
            }}
            previewHtml={selectedPreviewHtml}
            project={selectedProject}
            projects={projects}
            selectedArtifact={selectedArtifact}
            selectedFile={selectedFile}
            selectedRun={selectedCanvasRun}
          />
        </div>
      )}
    </div>
  );
}

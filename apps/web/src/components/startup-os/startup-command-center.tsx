"use client";

import {
  ArrowRight,
  BookClosed,
  Code,
  FolderClosed,
  Layers,
  Lightning,
  Paperclip,
  ShieldCheck,
  Sparkles,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import {
  buildStartupCanvasModel,
  type StartupCanvasEdge,
  type StartupCanvasLayout,
  type StartupCanvasNode,
  type StartupCanvasPoint,
} from "@/lib/startup-os/canvas";
import { companyName, valueProposition } from "@/lib/startup-os/company-context/projection";
import {
  STARTUP_ARENAS,
  type StartupArena,
  type StartupArtifact,
  type StartupOperatingRun,
  type StartupOSProject,
} from "@/lib/startup-os/compiler";
import { buildStartupPreviewHtml, type StartupOSFile } from "@/lib/startup-os/files";
import { StartupChatPanel } from "./startup-chat-panel";
import { StartupConnectorsMenu } from "./startup-connectors-menu";
import { StartupOsCodeView } from "./startup-os-code-view";
import { StartupOsFileTree } from "./startup-os-file-tree";

const PROJECTS_ENDPOINT = "/api/startup-os/projects";
const DEFAULT_THESIS = "";
const DEFAULT_CANVAS_ZOOM = 0.62;

// What one sentence compiles into. `Governed runs` is the differentiator — it is
// what makes Startup OS a *governed company* compiler, not just an app builder.
const COMPILE_OUTPUTS = [
  {
    icon: BookClosed,
    title: "CompanyContext",
    desc: "Mission, ICP, and positioning — the company's source of truth.",
    highlight: false,
  },
  {
    icon: Sparkles,
    title: "Launch artifacts",
    desc: "Brand, landing page, and pitch, generated together.",
    highlight: false,
  },
  {
    icon: FolderClosed,
    title: "Live files",
    desc: "A real, runnable app scaffold you can edit.",
    highlight: false,
  },
  {
    icon: Layers,
    title: "Spatial canvas",
    desc: "Every artifact mapped on one zoomable canvas.",
    highlight: false,
  },
  {
    icon: ShieldCheck,
    title: "Governed runs",
    desc: "Every agent run is approval-gated and audited.",
    highlight: true,
  },
] as const;

// Arena-specific example theses — clickable starters that defeat the blank page.
const EXAMPLE_THESES: Record<StartupArena, readonly string[]> = {
  "Developer infrastructure": [
    "A usage-metered API gateway for AI apps",
    "A self-host vector database with one-click cloud",
  ],
  "AI SaaS": [
    "An AI meeting-notes tool that drafts the follow-up email",
    "A support-deflection copilot for B2B SaaS",
  ],
  "Consumer product": [
    "A habit tracker that rewards streaks with friends",
    "A local-first journal with weekly AI reflection",
  ],
  "B2B operations": [
    "An approvals + audit workspace for finance teams",
    "A vendor-onboarding portal with compliance checks",
  ],
  "Creative tooling": [
    "A storyboard-to-video generator for marketers",
    "A brand-kit generator from a single logo",
  ],
};
interface ProjectsResponse {
  readonly projects: readonly StartupOSProject[];
  readonly activity?: unknown;
  readonly events?: unknown;
  readonly timeline?: unknown;
}

interface ProjectResponse {
  readonly project: StartupOSProject;
  readonly files?: readonly StartupOSFile[];
  readonly previewHtml?: string;
  readonly canvasLayout?: StartupCanvasLayout;
  readonly activity?: unknown;
  readonly events?: unknown;
  readonly timeline?: unknown;
}

interface FilesResponse {
  readonly project: StartupOSProject;
  readonly files: readonly StartupOSFile[];
  readonly previewHtml: string;
}

interface StartupActivityEvent {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly occurredAt?: string;
  readonly actor?: string;
}

interface StartupApiEvent {
  readonly id: string;
  readonly type: string;
  readonly summary: string;
  readonly occurredAt: string;
  readonly actorId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  return !Array.isArray(value);
}

function isStartupProject(value: unknown): value is StartupOSProject {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.thesis === "string" &&
    Array.isArray(value.artifacts) &&
    Array.isArray(value.runs) &&
    isRecord(value.companyContext)
  );
}

function isStartupFile(value: unknown): value is StartupOSFile {
  if (!isRecord(value)) return false;
  return (
    typeof value.path === "string" &&
    typeof value.kind === "string" &&
    typeof value.language === "string" &&
    typeof value.content === "string" &&
    typeof value.generatedFrom === "string" &&
    typeof value.updatedAt === "string"
  );
}

type StartupExplorerNode = {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly type: "folder" | "file";
  readonly file?: StartupOSFile;
  readonly children: StartupExplorerNode[];
};

type MutableStartupExplorerNode = {
  id: string;
  label: string;
  path: string;
  type: "folder" | "file";
  file?: StartupOSFile;
  children: MutableStartupExplorerNode[];
};

function sortExplorerNodes(nodes: MutableStartupExplorerNode[]): StartupExplorerNode[] {
  return nodes
    .sort((left, right) => {
      if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
      return left.label.localeCompare(right.label);
    })
    .map((node) => ({
      ...node,
      children: sortExplorerNodes(node.children),
    }));
}

function buildStartupExplorerTree(files: readonly StartupOSFile[]) {
  const root: MutableStartupExplorerNode[] = [];
  const folders = new Map<string, MutableStartupExplorerNode>();

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let siblings = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isFile) {
        siblings.push({
          id: `file:${file.path}`,
          label: part,
          path: file.path,
          type: "file",
          file,
          children: [],
        });
        return;
      }

      const folderId = `dir:${currentPath}`;
      let folder = folders.get(folderId);
      if (!folder) {
        folder = {
          id: folderId,
          label: part,
          path: currentPath,
          type: "folder",
          children: [],
        };
        folders.set(folderId, folder);
        siblings.push(folder);
      }
      siblings = folder.children;
    });
  }

  return sortExplorerNodes(root);
}

function getStartupExplorerExpandedIds(files: readonly StartupOSFile[]) {
  const ids = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let currentPath = "";
    for (let index = 0; index < parts.length - 1; index += 1) {
      currentPath = currentPath ? `${currentPath}/${parts[index]}` : parts[index];
      ids.add(`dir:${currentPath}`);
    }
  }
  return [...ids];
}

function isActivityEvent(value: unknown): value is StartupActivityEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.summary === "string"
  );
}

function isApiEvent(value: unknown): value is StartupApiEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    typeof value.summary === "string" &&
    typeof value.occurredAt === "string"
  );
}

function toActivityLabel(type: string) {
  return type
    .split("_")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function extractActivityEvents(payload: unknown): StartupActivityEvent[] {
  if (!isRecord(payload)) return [];
  const candidates = [payload.activity, payload.events, payload.timeline];
  const events = candidates.find(Array.isArray);
  if (!events) return [];
  return events
    .map((event): StartupActivityEvent | null => {
      if (isActivityEvent(event)) return event;
      if (!isApiEvent(event)) return null;
      return {
        id: event.id,
        label: toActivityLabel(event.type),
        summary: event.summary,
        occurredAt: event.occurredAt,
        actor: event.actorId,
      };
    })
    .filter((event): event is StartupActivityEvent => Boolean(event));
}

function formatRunStatus(status: StartupOperatingRun["status"]) {
  if (status === "completed") return "executed";
  if (status === "waiting_for_review") return "waiting for review";
  return status;
}

async function readApiJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === "string" ? payload.error : "Request failed.";
    throw new Error(message);
  }
  return payload as T;
}

function mergeProjectList(projects: readonly StartupOSProject[], project: StartupOSProject) {
  return [project, ...projects.filter((item) => item.id !== project.id)].slice(0, 12);
}

function getFirstExecutableRunId(runs: readonly StartupOperatingRun[]) {
  return (
    runs.find((run) => run.status === "planned" && run.approval !== "pending_review")?.id ?? null
  );
}

function isExecutableRun(run: StartupOperatingRun) {
  return run.status === "planned" && run.approval !== "pending_review";
}

function buildInitialCanvasPositions(
  model: ReturnType<typeof buildStartupCanvasModel>,
  canvasLayout: StartupCanvasLayout | null,
) {
  return {
    ...Object.fromEntries(
      model.nodes.map((node) => [node.id, { x: node.x, y: node.y } satisfies StartupCanvasPoint]),
    ),
    ...(canvasLayout?.nodePositions ?? {}),
  };
}

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
  const selectedArtifact =
    selectedProject?.artifacts.find((artifact) => artifact.id === selectedArtifactId) ??
    selectedProject?.artifacts[0] ??
    null;
  const executablePlannedRuns = (selectedProject?.runs ?? []).filter(
    (run) => run.status === "planned" && run.approval !== "pending_review",
  );
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
    selectedWorkspaceFiles.find((file) => file.path === "src/routes/index.tsx") ??
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
        : (nextFiles.find((file) => file.path === "src/routes/index.tsx")?.path ??
          nextFiles[0]?.path ??
          null),
    );
  }

  async function loadProjectFiles(projectId: string) {
    setLastError(null);
    try {
      const payload = await readApiJson<FilesResponse>(
        await fetch(`${PROJECTS_ENDPOINT}/${encodeURIComponent(projectId)}/files`, {
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
        await fetch(`${PROJECTS_ENDPOINT}/${encodeURIComponent(projectId)}`, {
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
          await fetch(PROJECTS_ENDPOINT, {
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
        await fetch(
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
        await fetch(PROJECTS_ENDPOINT, {
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
        await fetch(`${PROJECTS_ENDPOINT}/${encodeURIComponent(selectedProject.id)}/review`, {
          method: "POST",
          headers: { Accept: "application/json" },
        }),
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
        await fetch(`${PROJECTS_ENDPOINT}/${encodeURIComponent(projectId)}/canvas`, {
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
        await fetch(`${PROJECTS_ENDPOINT}/${encodeURIComponent(selectedProject.id)}/files`, {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path, content }),
        }),
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
    <div className="relative h-full min-h-0">
      {lastError ? (
        <div className="absolute left-4 top-4 z-20 rounded-full bg-red-3 px-3 py-1.5 text-xs font-medium text-red-11 shadow-sm dark:bg-red-9/20 dark:text-red-5">
          {lastError}
        </div>
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
        <div>
          <StartupBuilderWorkspace
            activityCount={activityEvents.length}
            canvasLayout={selectedCanvasLayout}
            isApproving={isApproving}
            isExecuting={isExecutingRun}
            isSavingFile={isSavingFile}
            onChatApplied={() => void loadProjectFiles(selectedProject.id)}
            onApprove={approveReviewGate}
            onExecuteRun={requestRunExecution}
            onPersistLayout={(layout) => persistCanvasLayout(selectedProject.id, layout)}
            onSaveFile={saveWorkspaceFile}
            onSelectArtifact={setSelectedArtifactId}
            onSelectFile={setSelectedFilePath}
            onSelectRun={(runId) => {
              const run = selectedProject.runs.find((item) => item.id === runId);
              setSelectedCanvasRunId(runId);
              if (run && isExecutableRun(run)) {
                setSelectedExecutionRunId(runId);
              }
            }}
            project={selectedProject}
            selectedArtifact={selectedArtifact}
            selectedFile={selectedFile}
            files={selectedWorkspaceFiles}
            previewHtml={selectedPreviewHtml}
            selectedRun={selectedCanvasRun}
          />
        </div>
      )}
    </div>
  );
}

function StartupBuilderHome({
  arena,
  canCompile,
  disabled,
  isLoading,
  isSaving,
  onArenaChange,
  onCompile,
  onProjectSelect,
  projects,
  selectedProjectId,
  thesis,
  onThesisChange,
}: {
  arena: StartupArena;
  canCompile: boolean;
  disabled: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onArenaChange: (arena: StartupArena) => void;
  onCompile: () => void;
  onProjectSelect: (project: StartupOSProject) => void;
  projects: readonly StartupOSProject[];
  selectedProjectId: string | null;
  thesis: string;
  onThesisChange: (value: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real local-file attach: fold a text file's content into the proposition so it
  // actually feeds the compiler. No cloud-source mocks — Drive/Figma/etc. need
  // real integrations, not dead menu items.
  const handleAttachFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const parts: string[] = [];
    for (const file of Array.from(fileList)) {
      const text = (await file.text()).trim();
      if (text) parts.push(`\n\n--- Attached: ${file.name} ---\n${text}`);
    }
    if (parts.length > 0) onThesisChange(`${thesis}${parts.join("")}`.trimStart());
  };

  return (
    <AnimateIn preset="emerge">
      <section className="relative min-h-screen overflow-hidden bg-neutral-1 text-neutral-12">
        {/* Ambient brand glow — subtle (governed/enterprise), not a loud aurora. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[380px] w-full max-w-3xl opacity-[0.12] blur-3xl"
          style={{ background: "var(--brand-gradient)" }}
        />
        <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
          <div className="mx-auto w-full max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-6 bg-neutral-1/80 px-3 py-1.5 text-xs font-semibold text-neutral-11 backdrop-blur">
              <Lightning className="size-3.5 text-blue-9" aria-hidden="true" />
              Startup Agent OS
            </span>
            <h2
              className="mt-6 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl"
              style={{
                background: "var(--brand-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              What are we building?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-neutral-10">
              One sentence compiles into a whole governed company — context, launch artifacts, live
              files, spatial canvas, and approval-gated runs.
            </p>

            <div className="mx-auto mt-8 overflow-hidden rounded-[30px] border border-neutral-7 bg-neutral-1 text-left shadow-lg shadow-neutral-12/5">
              {/* Chromeless native textarea: the @nebutra/ui Textarea primitive is a
                  bordered "field" (own border/shadow + inline radius) that leaves a
                  seam inside this unified box. data-allow-native is the sanctioned
                  opt-out for a genuinely seamless prompt surface (same as the file
                  input above). */}
              <textarea
                data-allow-native
                aria-label="Startup proposition"
                value={thesis}
                onChange={(event) => onThesisChange(event.target.value)}
                disabled={disabled || isLoading}
                placeholder="Describe the startup proposition to compile into a tenant-scoped company workspace..."
                className="block min-h-[150px] w-full resize-none border-0 bg-transparent p-5 text-lg leading-7 text-neutral-12 outline-none placeholder:text-neutral-9 focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:p-6"
              />
              <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <input
                    data-allow-native
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.md,.markdown,.json,.csv,.yaml,.yml,text/*"
                    className="sr-only"
                    onChange={(event) => {
                      void handleAttachFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isLoading}
                    aria-label="Attach a file"
                    title="Attach a text file to fold into the proposition"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-7 bg-neutral-1 text-neutral-11 transition-colors hover:bg-neutral-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Paperclip className="size-4" aria-hidden="true" />
                  </button>
                  <Select
                    value={arena}
                    onValueChange={(value) => onArenaChange(value as StartupArena)}
                    disabled={disabled || isLoading}
                  >
                    <SelectTrigger
                      aria-label="Startup arena"
                      className="h-auto w-fit rounded-full border border-neutral-7 bg-neutral-1 px-3.5 py-2 text-xs font-semibold text-neutral-11 shadow-none transition-colors hover:bg-neutral-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STARTUP_ARENAS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <StartupConnectorsMenu disabled={disabled || isLoading} />
                </div>
                <button
                  type="button"
                  disabled={!canCompile}
                  onClick={onCompile}
                  aria-label={isSaving ? "Building" : "Build"}
                  title={isSaving ? "Building…" : "Build"}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-12 text-neutral-1 transition-colors hover:bg-neutral-11 disabled:cursor-not-allowed disabled:opacity-45 dark:text-neutral-12"
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {thesis.trim().length === 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-neutral-9">Try</span>
                {EXAMPLE_THESES[arena].map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={disabled || isLoading}
                    onClick={() => onThesisChange(example)}
                    className="rounded-full border border-neutral-6 bg-neutral-1 px-3 py-1.5 text-xs font-medium text-neutral-11 transition-colors hover:border-blue-7 hover:bg-blue-2 hover:text-blue-11 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {example}
                  </button>
                ))}
              </div>
            ) : null}

            <AnimateInGroup
              stagger="normal"
              className="mt-10 grid grid-cols-2 gap-3 text-left sm:grid-cols-3 lg:grid-cols-5"
            >
              {COMPILE_OUTPUTS.map((output) => {
                const OutputIcon = output.icon;
                return (
                  <AnimateIn key={output.title} preset="fadeUp">
                    <div
                      className={`flex h-full flex-col gap-2 rounded-2xl border p-3.5 ${
                        output.highlight
                          ? "border-blue-7 bg-blue-2/60 dark:border-blue-7/60 dark:bg-blue-9/15"
                          : "border-neutral-6 bg-neutral-1"
                      }`}
                    >
                      <OutputIcon
                        className={`size-4 ${output.highlight ? "text-blue-9" : "text-neutral-10"}`}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-semibold text-neutral-12">{output.title}</span>
                      <span className="text-xs leading-5 text-neutral-10">{output.desc}</span>
                    </div>
                  </AnimateIn>
                );
              })}
            </AnimateInGroup>

            {projects.length > 0 ? (
              <div className="mx-auto mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
                {projects.slice(0, 4).map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onProjectSelect(project)}
                    className={`rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                      project.id === selectedProjectId
                        ? "border-blue-8 bg-blue-2 text-blue-12 dark:border-blue-7/70 dark:bg-blue-9/18 dark:text-blue-4"
                        : "border-neutral-6 bg-neutral-1 text-neutral-11 hover:bg-neutral-2"
                    }`}
                  >
                    <span className="block truncate text-sm font-semibold">
                      {companyName(project.companyContext)}
                    </span>
                    <span className="mt-1 block truncate text-[11px] opacity-65">
                      {project.arena} / {project.status}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AnimateIn>
  );
}

function StartupBuilderWorkspace({
  activityCount,
  canvasLayout,
  isApproving,
  isExecuting,
  isSavingFile,
  onChatApplied,
  onApprove,
  onExecuteRun,
  onPersistLayout,
  onSaveFile,
  onSelectArtifact,
  onSelectFile,
  onSelectRun,
  project,
  files,
  previewHtml,
  selectedArtifact,
  selectedFile,
  selectedRun,
}: {
  activityCount: number;
  canvasLayout: StartupCanvasLayout | null;
  isApproving: boolean;
  isExecuting: boolean;
  isSavingFile: boolean;
  onChatApplied: () => void;
  onApprove: () => void;
  onExecuteRun: (runId?: string) => void;
  onPersistLayout: (layout: StartupCanvasLayout) => Promise<void>;
  onSaveFile: (path: string, content: string) => Promise<void>;
  onSelectArtifact: (artifactId: string) => void;
  onSelectFile: (path: string) => void;
  onSelectRun: (runId: string) => void;
  project: StartupOSProject;
  files: readonly StartupOSFile[];
  previewHtml: string;
  selectedArtifact: StartupArtifact | null;
  selectedFile: StartupOSFile | null;
  selectedRun: StartupOperatingRun | null;
}) {
  const [activeSurface, setActiveSurface] = useState<"code" | "canvas" | "chat">("code");
  const threadItems = [
    {
      title: "Proposition captured",
      body: project.thesis,
      tone: "neutral",
    },
    {
      title: "CompanyContext compiled",
      body: valueProposition(project.companyContext),
      tone: "blue",
    },
    selectedRun
      ? {
          title: `Selected run / ${selectedRun.stage}`,
          body: `${selectedRun.summary} Approval: ${selectedRun.approval}. Status: ${formatRunStatus(
            selectedRun.status,
          )}.`,
          tone: selectedRun.approval === "pending_review" ? "amber" : "neutral",
        }
      : null,
  ].filter((item): item is { title: string; body: string; tone: string } => Boolean(item));

  return (
    <AnimateIn preset="fadeUp" className="h-full min-h-0">
      <section className="h-full min-h-0 overflow-hidden bg-neutral-1 text-neutral-12">
        <div className="grid h-full xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r border-neutral-6 bg-neutral-1">
            <div className="border-b border-neutral-6 p-4">
              <div className="flex min-w-0 items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold tracking-[-0.02em] text-neutral-12">
                      {companyName(project.companyContext)}
                    </h2>
                    <StatusPill
                      status={project.status === "review_ready" ? "completed" : "planned"}
                    />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-10">
                    {project.slug} / {project.arena}
                  </p>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 text-xs leading-5 text-neutral-10">
                {valueProposition(project.companyContext)}
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {threadItems.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-[20px] border p-3 ${
                    item.tone === "blue"
                      ? "border-blue-6 bg-blue-2 dark:border-blue-8/40 dark:bg-blue-9/15"
                      : item.tone === "amber"
                        ? "border-amber-6 bg-amber-2 dark:border-amber-8/40 dark:bg-amber-9/15"
                        : "border-neutral-6 bg-neutral-1"
                  }`}
                >
                  <p className="text-xs font-semibold tracking-[-0.01em] text-neutral-12">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-neutral-10">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-6 p-3">
              <div className="rounded-[22px] border border-neutral-6 bg-neutral-2 p-3">
                <div className="text-xs leading-5 text-neutral-10">
                  {activityCount > 0
                    ? `${activityCount} persisted API event${activityCount > 1 ? "s" : ""}.`
                    : "Select a run to approve or execute through the governed API."}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-neutral-6 bg-neutral-1 px-2.5 py-1 text-[11px] font-semibold text-neutral-10">
                    {selectedRun?.approval === "pending_review" ? "Review" : "Build"}
                  </span>
                  {selectedRun?.approval === "pending_review" ? (
                    <button
                      type="button"
                      disabled={isApproving}
                      onClick={onApprove}
                      className="rounded-full bg-amber-9 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-10 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isApproving ? "Approving" : "Approve"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!selectedRun || !isExecutableRun(selectedRun) || isExecuting}
                      onClick={() => onExecuteRun(selectedRun?.id)}
                      className="grid size-9 place-items-center rounded-full bg-neutral-12 text-neutral-1 transition-colors hover:bg-neutral-11 disabled:cursor-not-allowed disabled:opacity-45 dark:text-neutral-12"
                      aria-label="Execute selected run"
                    >
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-col bg-neutral-1">
            <div className="flex h-14 items-center justify-between gap-3 border-b border-neutral-6 px-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-12">
                  {selectedFile?.path ?? selectedArtifact?.title ?? "Startup OS workspace"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-neutral-9">
                  {companyName(project.companyContext)}
                </p>
              </div>
              <div className="flex shrink-0 rounded-full border border-neutral-6 bg-neutral-2 p-1">
                {(
                  [
                    { key: "code", label: "Code", Icon: Code },
                    { key: "canvas", label: "Canvas", Icon: Lightning },
                    { key: "chat", label: "Chat", Icon: Sparkles },
                  ] as const
                ).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveSurface(key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeSurface === key
                        ? "bg-neutral-12 text-neutral-1 dark:text-neutral-12"
                        : "text-neutral-10 hover:bg-neutral-1"
                    }`}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={activeSurface === "code" ? "min-h-0 flex-1" : "hidden"}>
              <WorkspaceFilesPanel
                artifacts={project.artifacts}
                files={files}
                isSavingFile={isSavingFile}
                onSaveFile={onSaveFile}
                onSelectArtifact={onSelectArtifact}
                onSelectFile={onSelectFile}
                onSelectRun={onSelectRun}
                previewHtml={previewHtml}
                runs={project.runs}
                selectedArtifactId={selectedArtifact?.id ?? null}
                selectedFile={selectedFile}
                selectedRunId={selectedRun?.id ?? null}
              />
            </div>

            <div className={activeSurface === "canvas" ? "min-h-0 flex-1" : "hidden"}>
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

            <div className={activeSurface === "chat" ? "min-h-0 flex-1" : "hidden"}>
              <StartupChatPanel onApplied={onChatApplied} projectId={project.id} />
            </div>
          </main>
        </div>
      </section>
    </AnimateIn>
  );
}

function ExplorerReferenceSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="mt-3 first:mt-0">
      <h3 className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-8">
        {title}
      </h3>
      <div className="mt-1 grid gap-0.5">{children}</div>
    </section>
  );
}

function WorkspaceFilesPanel({
  artifacts,
  files,
  isSavingFile,
  onSaveFile,
  onSelectArtifact,
  onSelectFile,
  onSelectRun,
  previewHtml,
  runs,
  selectedArtifactId,
  selectedFile,
  selectedRunId,
}: {
  artifacts: readonly StartupArtifact[];
  files: readonly StartupOSFile[];
  isSavingFile: boolean;
  onSaveFile: (path: string, content: string) => Promise<void>;
  onSelectArtifact: (artifactId: string) => void;
  onSelectFile: (path: string) => void;
  onSelectRun: (runId: string) => void;
  previewHtml: string;
  runs: readonly StartupOperatingRun[];
  selectedArtifactId: string | null;
  selectedFile: StartupOSFile | null;
  selectedRunId: string | null;
}) {
  const [draftContent, setDraftContent] = useState(selectedFile?.content ?? "");
  const deferredDraftContent = useDeferredValue(draftContent);
  const isDirty = Boolean(selectedFile && draftContent !== selectedFile.content);
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

  async function save() {
    if (!selectedFile || !isDirty) return;
    await onSaveFile(selectedFile.path, draftContent);
  }

  return (
    <AnimateIn preset="fadeUp" className="h-full min-h-0">
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-1">
        <div className="flex flex-col gap-3 border-b border-neutral-6 bg-neutral-1 p-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Code className="size-4 text-neutral-10" aria-hidden="true" />
              <h2 className="text-sm font-semibold tracking-[-0.02em] text-neutral-12">
                Code and preview
              </h2>
              <span className="rounded-full bg-neutral-2 px-2 py-0.5 text-[11px] font-semibold text-neutral-10 ring-1 ring-neutral-6">
                {files.length} files
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-neutral-10">
              {selectedFile ? selectedFile.path : "Select a persisted file to edit the app."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!selectedFile || !isDirty || isSavingFile}
              onClick={() => void save()}
              className="rounded-full bg-neutral-12 px-3.5 py-1.5 text-xs font-semibold text-neutral-1 transition-colors hover:bg-neutral-11 disabled:cursor-not-allowed disabled:opacity-45 dark:text-neutral-12"
            >
              {isSavingFile ? "Saving..." : isDirty ? "Save file" : "Saved"}
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r border-neutral-6 bg-neutral-2/60">
            <div className="border-b border-neutral-6 px-3 py-2">
              <p className="text-xs font-semibold text-neutral-12">Files</p>
              <p className="mt-0.5 text-[11px] text-neutral-9">Persisted workspace</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <StartupOsFileTree
                defaultExpandedIds={expandedIds}
                nodes={tree}
                onSelect={onSelectFile}
                selectedPath={selectedFile?.path ?? null}
                treeKey={files.map((file) => file.path).join("|")}
              />
            </div>
            <div className="border-t border-neutral-6 p-2">
              <ExplorerReferenceSection title="Artifacts">
                {artifacts.slice(0, 3).map((artifact) => (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => onSelectArtifact(artifact.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] px-2.5 py-2 text-left text-[11px] transition-colors ${
                      selectedArtifactId === artifact.id
                        ? "bg-blue-3 text-blue-12 dark:bg-blue-9/20 dark:text-blue-5"
                        : "text-neutral-10 hover:bg-neutral-1"
                    }`}
                  >
                    <span className="min-w-0 truncate">{artifact.title}</span>
                    <span className="shrink-0 opacity-60">{artifact.status}</span>
                  </button>
                ))}
              </ExplorerReferenceSection>
              <ExplorerReferenceSection title="Runs">
                {runs.slice(0, 3).map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => onSelectRun(run.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] px-2.5 py-2 text-left text-[11px] transition-colors ${
                      selectedRunId === run.id
                        ? "bg-blue-3 text-blue-12 dark:bg-blue-9/20 dark:text-blue-5"
                        : "text-neutral-10 hover:bg-neutral-1"
                    }`}
                  >
                    <span className="min-w-0 truncate">{run.stage}</span>
                    <span className="shrink-0 opacity-60">{formatRunStatus(run.status)}</span>
                  </button>
                ))}
              </ExplorerReferenceSection>
            </div>
          </aside>

          <div className="grid min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.82fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.82fr)]">
            <div className="flex min-h-0 flex-col border-b border-neutral-6 xl:border-b-0 xl:border-r">
              <div className="flex gap-1 overflow-x-auto border-b border-neutral-6 bg-neutral-2 p-2">
                {files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => onSelectFile(file.path)}
                    className={`shrink-0 rounded-[var(--radius-md)] px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                      selectedFile?.path === file.path
                        ? "bg-neutral-12 text-neutral-1 dark:text-neutral-12"
                        : "text-neutral-10 hover:bg-neutral-1"
                    }`}
                  >
                    {file.path}
                  </button>
                ))}
              </div>
              {selectedFile ? (
                <StartupOsCodeView
                  file={selectedFile}
                  isSaving={isSavingFile}
                  onSave={(content) => onSaveFile(selectedFile.path, content)}
                />
              ) : (
                <div className="grid min-h-[360px] flex-1 place-items-center p-8 text-center text-sm text-neutral-10">
                  Select a persisted file from the workspace.
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-col bg-neutral-2">
              <div className="flex items-center justify-between border-b border-neutral-6 px-3 py-2">
                <span className="text-xs font-semibold text-neutral-12">Live preview</span>
                <span className="text-[11px] text-neutral-9">iframe srcDoc / no deploy</span>
              </div>
              {livePreviewHtml ? (
                <iframe
                  title="Startup OS generated app preview"
                  sandbox=""
                  srcDoc={livePreviewHtml}
                  className="min-h-0 flex-1 border-0 bg-white"
                />
              ) : (
                <div className="grid flex-1 place-items-center p-8 text-center text-sm text-neutral-10">
                  Preview is unavailable until the project API returns persisted files.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </AnimateIn>
  );
}

function StartupCanvasPanel({
  canvasLayout,
  isExecuting,
  onExecuteRun,
  onPersistLayout,
  onSelectArtifact,
  onSelectRun,
  project,
  selectedArtifactId,
  selectedRun,
}: {
  canvasLayout: StartupCanvasLayout | null;
  isExecuting: boolean;
  onExecuteRun: (runId: string) => void;
  onPersistLayout: (layout: StartupCanvasLayout) => Promise<void>;
  onSelectArtifact: (artifactId: string) => void;
  onSelectRun: (runId: string) => void;
  project: StartupOSProject;
  selectedArtifactId: string | null;
  selectedRun: StartupOperatingRun | null;
}) {
  const model = buildStartupCanvasModel(project);
  const initialPositions = buildInitialCanvasPositions(model, canvasLayout);
  const [nodePositions, setNodePositions] =
    useState<Record<string, StartupCanvasPoint>>(initialPositions);
  const nodePositionsRef = useRef<Record<string, StartupCanvasPoint>>(initialPositions);
  const [zoom, setZoom] = useState(canvasLayout?.zoom ?? DEFAULT_CANVAS_ZOOM);
  const dragRef = useRef<{
    readonly nodeId: string;
    readonly offsetX: number;
    readonly offsetY: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const selectedArtifact = selectedArtifactId
    ? project.artifacts.find((artifact) => artifact.id === selectedArtifactId)
    : null;
  const selectedRunExecutable = selectedRun ? isExecutableRun(selectedRun) : false;
  const selectedNodeId =
    (selectedArtifact ? `artifact:${selectedArtifact.id}` : null) ??
    (selectedRun ? `run:${selectedRun.id}` : null);

  useEffect(() => {
    const nextModel = buildStartupCanvasModel(project);
    const nextPositions = buildInitialCanvasPositions(nextModel, canvasLayout);
    nodePositionsRef.current = nextPositions;
    setNodePositions(nextPositions);
    setZoom(canvasLayout?.zoom ?? DEFAULT_CANVAS_ZOOM);
  }, [canvasLayout, project]);

  function layoutPayload(
    positions: Record<string, StartupCanvasPoint>,
    nextZoom: number,
  ): StartupCanvasLayout {
    const knownNodeIds = new Set(model.nodes.map((node) => node.id));
    return {
      zoom: nextZoom,
      updatedAt: new Date().toISOString(),
      nodePositions: Object.fromEntries(
        Object.entries(positions).filter(([nodeId]) => knownNodeIds.has(nodeId)),
      ),
    };
  }

  function persistLayout(
    positions: Record<string, StartupCanvasPoint> = nodePositionsRef.current,
    nextZoom = zoom,
  ) {
    void onPersistLayout(layoutPayload(positions, nextZoom));
  }

  function resetLayout() {
    const resetZoom = DEFAULT_CANVAS_ZOOM;
    nodePositionsRef.current = initialPositions;
    setNodePositions(initialPositions);
    setZoom(resetZoom);
    persistLayout(initialPositions, resetZoom);
  }

  function changeZoom(nextZoom: number) {
    setZoom(nextZoom);
    persistLayout(nodePositions, nextZoom);
  }

  function positionFor(node: StartupCanvasNode) {
    return nodePositions[node.id] ?? { x: node.x, y: node.y };
  }

  function pointFor(node: StartupCanvasNode, side: "left" | "right") {
    const position = positionFor(node);
    return {
      x: side === "left" ? position.x : position.x + node.width,
      y: position.y + node.height / 2,
    };
  }

  function pathFor(edge: StartupCanvasEdge) {
    const fromNode = model.nodes.find((node) => node.id === edge.from);
    const toNode = model.nodes.find((node) => node.id === edge.to);
    if (!fromNode || !toNode) return "";
    const from = pointFor(fromNode, "right");
    const to = pointFor(toNode, "left");
    const tension = Math.max(64, Math.min(150, Math.abs(to.x - from.x) * 0.45));
    return `M ${from.x} ${from.y} C ${from.x + tension} ${from.y}, ${to.x - tension} ${to.y}, ${to.x} ${to.y}`;
  }

  function selectNode(node: StartupCanvasNode) {
    if (node.artifactId) onSelectArtifact(node.artifactId);
    if (node.runId) onSelectRun(node.runId);
  }

  function startDrag(node: StartupCanvasNode, event: ReactPointerEvent<HTMLButtonElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const position = positionFor(node);
    dragRef.current = {
      nodeId: node.id,
      offsetX: position.x - (event.clientX - rect.left) / zoom,
      offsetY: position.y - (event.clientY - rect.top) / zoom,
    };
    selectNode(node);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const node = model.nodes.find((item) => item.id === drag.nodeId);
    if (!node) return;
    const nextX = (event.clientX - rect.left) / zoom + drag.offsetX;
    const nextY = (event.clientY - rect.top) / zoom + drag.offsetY;
    setNodePositions((current) => {
      const next = {
        ...current,
        [drag.nodeId]: {
          x: Math.max(12, Math.min(model.width - node.width - 12, nextX)),
          y: Math.max(12, Math.min(model.height - node.height - 12, nextY)),
        },
      };
      nodePositionsRef.current = next;
      return next;
    });
  }

  function finishDrag() {
    if (!dragRef.current) return;
    dragRef.current = null;
    persistLayout();
  }

  return (
    <AnimateIn preset="fadeUp" className="h-full min-h-0">
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-1">
        <div className="flex flex-col gap-3 border-b border-neutral-6 bg-neutral-1 p-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-[-0.02em] text-neutral-12">
                Company canvas
              </h2>
              <span className="rounded-full bg-blue-3 px-2 py-0.5 text-[11px] font-semibold text-blue-11 dark:bg-blue-9/20 dark:text-blue-5">
                Spatial graph
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-10">
              Drag nodes, inspect dependencies, and start eligible runs from the same company-state
              surface. The graph is derived from persisted artifacts and runs; success state is only
              accepted from the API response.
            </p>
          </div>
          <div className="flex w-fit items-center gap-1.5 rounded-[var(--radius-md)] border border-neutral-6 bg-neutral-2 p-1">
            <button
              type="button"
              onClick={() => changeZoom(Math.max(0.54, Number((zoom - 0.08).toFixed(2))))}
              className="shrink-0 whitespace-nowrap rounded-[12px] px-2 py-1 text-xs font-semibold text-neutral-11 hover:bg-neutral-1"
            >
              -
            </button>
            <span className="min-w-12 shrink-0 whitespace-nowrap text-center text-[11px] font-medium text-neutral-10">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => changeZoom(Math.min(1.08, Number((zoom + 0.08).toFixed(2))))}
              className="shrink-0 whitespace-nowrap rounded-[12px] px-2 py-1 text-xs font-semibold text-neutral-11 hover:bg-neutral-1"
            >
              +
            </button>
            <button
              type="button"
              onClick={resetLayout}
              className="shrink-0 whitespace-nowrap rounded-[12px] px-2 py-1 text-xs font-semibold text-neutral-11 hover:bg-neutral-1"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 overflow-auto bg-neutral-2 p-4">
            <div
              className="relative"
              style={{ width: model.width * zoom, height: model.height * zoom }}
              onPointerLeave={finishDrag}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
            >
              <div
                ref={canvasRef}
                className="absolute left-0 top-0 rounded-[var(--radius-xl)]"
                style={{
                  width: model.width,
                  height: model.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              >
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  height={model.height}
                  width={model.width}
                >
                  <defs>
                    <marker
                      id="startup-canvas-arrow"
                      markerHeight="8"
                      markerWidth="8"
                      orient="auto"
                      refX="7"
                      refY="4"
                    >
                      <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--neutral-8)" />
                    </marker>
                  </defs>
                  {model.edges.map((edge) => (
                    <path
                      key={edge.id}
                      d={pathFor(edge)}
                      fill="none"
                      markerEnd="url(#startup-canvas-arrow)"
                      stroke={edge.kind === "run_artifact" ? "var(--blue-8)" : "var(--neutral-7)"}
                      strokeDasharray={edge.kind === "run_artifact" ? "0" : "5 6"}
                      strokeLinecap="round"
                      strokeWidth={edge.kind === "run_artifact" ? 1.8 : 1.2}
                    />
                  ))}
                </svg>

                {model.nodes.map((node) => {
                  const position = positionFor(node);
                  const selected =
                    node.id === selectedNodeId ||
                    Boolean(node.runId && selectedRun?.id === node.runId) ||
                    Boolean(node.artifactId && selectedArtifactId === node.artifactId);
                  return (
                    <CanvasNodeButton
                      key={node.id}
                      node={node}
                      onPointerDown={(event) => startDrag(node, event)}
                      onSelect={() => selectNode(node)}
                      position={position}
                      selected={selected}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="min-h-0 overflow-y-auto border-t border-neutral-6 bg-neutral-1 p-4 2xl:border-l 2xl:border-t-0">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-9">
              Canvas inspector
            </h3>
            {selectedArtifact ? (
              <div className="mt-3 rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-1 p-3">
                <p className="text-sm font-semibold text-neutral-12">{selectedArtifact.title}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-10">{selectedArtifact.summary}</p>
                <div className="mt-3 grid gap-1.5 text-[11px] text-neutral-10">
                  <span>Status: {selectedArtifact.status}</span>
                  <span>Owner: {selectedArtifact.owner}</span>
                  <span>
                    Dependencies:{" "}
                    {selectedArtifact.dependencies.length > 0
                      ? selectedArtifact.dependencies.join(", ")
                      : "CompanyContext"}
                  </span>
                </div>
              </div>
            ) : null}

            {selectedRun ? (
              <div className="mt-3 rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-1 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-12">{selectedRun.stage}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-10">{selectedRun.summary}</p>
                  </div>
                  <StatusPill status={selectedRun.status} />
                </div>
                <div className="mt-3 grid gap-1.5 text-[11px] text-neutral-10">
                  <span>Adapter: {selectedRun.adapter}</span>
                  <span>Approval: {selectedRun.approval}</span>
                  <span>Budget: ${selectedRun.costEstimateUsd.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  disabled={!selectedRunExecutable || isExecuting}
                  onClick={() => onExecuteRun(selectedRun.id)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-neutral-12 px-3 py-2 text-[13px] font-semibold text-neutral-1 transition-colors hover:bg-neutral-11 disabled:cursor-not-allowed disabled:opacity-45 dark:text-neutral-12"
                >
                  <Lightning className="size-3.5" aria-hidden="true" />
                  {isExecuting
                    ? "Executing..."
                    : selectedRunExecutable
                      ? "Execute selected run"
                      : "Not executable"}
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </AnimateIn>
  );
}

function CanvasNodeButton({
  node,
  onPointerDown,
  onSelect,
  position,
  selected,
}: {
  node: StartupCanvasNode;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onSelect: () => void;
  position: StartupCanvasPoint;
  selected: boolean;
}) {
  const tone =
    node.kind === "context"
      ? "context"
      : node.status === "completed" || node.status === "ready"
        ? "ready"
        : node.status === "failed"
          ? "failed"
          : node.status === "waiting_for_review" || node.status === "review_required"
            ? "review"
            : "planned";
  const toneClass = {
    context:
      "border-blue-8 bg-blue-3 text-blue-12 shadow-lg dark:border-blue-7 dark:bg-blue-9/20 dark:text-blue-4",
    failed:
      "border-red-7 bg-red-2 text-red-12 dark:border-red-8/60 dark:bg-red-9/15 dark:text-red-4",
    planned: "border-neutral-6 bg-neutral-1 text-neutral-12",
    ready:
      "border-green-7 bg-green-2 text-green-12 dark:border-green-8/60 dark:bg-green-9/15 dark:text-green-4",
    review:
      "border-amber-7 bg-amber-2 text-amber-12 dark:border-amber-8/60 dark:bg-amber-9/15 dark:text-amber-4",
  }[tone];

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={onPointerDown}
      className={`absolute cursor-grab rounded-[var(--radius-lg)] border p-3 text-left shadow-sm transition-colors active:cursor-grabbing ${
        selected ? "ring-2 ring-blue-8 ring-offset-2 ring-offset-neutral-1 dark:ring-blue-5" : ""
      } ${toneClass}`}
      style={{
        height: node.height,
        left: position.x,
        top: position.y,
        width: node.width,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{node.title}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 opacity-75">{node.subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-1 px-2 py-0.5 text-[10px] font-medium text-neutral-12 ring-1 ring-neutral-6">
          {node.kind}
        </span>
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] opacity-70">
        {node.status}
      </p>
    </button>
  );
}

function StatusPill({ status }: { status: StartupOperatingRun["status"] }) {
  const className =
    status === "completed"
      ? "bg-green-3 text-green-11 dark:bg-green-9/20 dark:text-green-5"
      : status === "failed"
        ? "bg-red-3 text-red-11 dark:bg-red-9/20 dark:text-red-5"
        : status === "waiting_for_review"
          ? "bg-amber-3 text-amber-11 dark:bg-amber-9/20 dark:text-amber-5"
          : "bg-neutral-3 text-neutral-11";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {formatRunStatus(status)}
    </span>
  );
}

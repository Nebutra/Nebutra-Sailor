/**
 * Startup OS workspace model — the non-visual half of the command center.
 *
 * Payload shapes, runtime guards, explorer-tree construction, run predicates and
 * the thin API fetch wrapper all live here so the React surfaces stay about
 * layout and interaction. Nothing in this module renders or holds state.
 */

import type {
  buildStartupCanvasModel,
  StartupCanvasLayout,
  StartupCanvasPoint,
} from "@nebutra/startup-os/canvas";
import type { StartupOperatingRun, StartupOSProject } from "@nebutra/startup-os/compiler";
import type { StartupOSFile } from "@nebutra/startup-os/files";
import { resolveApiUrl } from "@/lib/api/browser-client";

export const PROJECTS_ENDPOINT = "/api/startup-os/projects";
export const DEFAULT_THESIS = "";
export const DEFAULT_CANVAS_ZOOM = 0.62;

/** How many recent projects the client keeps in memory for the switcher. */
const PROJECT_LIST_LIMIT = 12;

// =============================================================================
// API payload shapes
// =============================================================================

export interface ProjectsResponse {
  readonly projects: readonly StartupOSProject[];
  readonly activity?: unknown;
  readonly events?: unknown;
  readonly timeline?: unknown;
}

export interface ProjectResponse {
  readonly project: StartupOSProject;
  readonly files?: readonly StartupOSFile[];
  readonly previewHtml?: string;
  readonly canvasLayout?: StartupCanvasLayout;
  readonly activity?: unknown;
  readonly events?: unknown;
  readonly timeline?: unknown;
}

export interface FilesResponse {
  readonly project: StartupOSProject;
  readonly files: readonly StartupOSFile[];
  readonly previewHtml: string;
}

export interface StartupActivityEvent {
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

// =============================================================================
// Runtime guards — the API is a network boundary, so nothing is trusted
// =============================================================================

export function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  return !Array.isArray(value);
}

export function isStartupProject(value: unknown): value is StartupOSProject {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.thesis === "string" &&
    Array.isArray(value.artifacts) &&
    Array.isArray(value.runs) &&
    isRecord(value.companyContext)
  );
}

export function isStartupFile(value: unknown): value is StartupOSFile {
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

// =============================================================================
// Explorer tree
// =============================================================================

export type StartupExplorerNode = {
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

export function buildStartupExplorerTree(files: readonly StartupOSFile[]) {
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

export function getStartupExplorerExpandedIds(files: readonly StartupOSFile[]) {
  const ids = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let currentPath = "";
    for (const part of parts.slice(0, -1)) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      ids.add(`dir:${currentPath}`);
    }
  }
  return [...ids];
}

// =============================================================================
// Activity + run helpers
// =============================================================================

function toActivityLabel(type: string) {
  return type
    .split("_")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function extractActivityEvents(payload: unknown): StartupActivityEvent[] {
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

export function formatRunStatus(status: StartupOperatingRun["status"]) {
  if (status === "completed") return "executed";
  if (status === "waiting_for_review") return "waiting for review";
  return status;
}

export function mergeProjectList(projects: readonly StartupOSProject[], project: StartupOSProject) {
  return [project, ...projects.filter((item) => item.id !== project.id)].slice(
    0,
    PROJECT_LIST_LIMIT,
  );
}

export function getFirstExecutableRunId(runs: readonly StartupOperatingRun[]) {
  return (
    runs.find((run) => run.status === "planned" && run.approval !== "pending_review")?.id ?? null
  );
}

export function isExecutableRun(run: StartupOperatingRun) {
  return run.status === "planned" && run.approval !== "pending_review";
}

export function buildInitialCanvasPositions(
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

// =============================================================================
// Fetch layer
// =============================================================================

export async function readApiJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === "string" ? payload.error : "Request failed.";
    throw new Error(message);
  }
  return payload as T;
}

export function fetchStartupApi(path: string, init?: RequestInit) {
  return fetch(resolveApiUrl(path), {
    credentials: "include",
    ...init,
    headers: {
      ...init?.headers,
    },
  });
}

import { isStartupCanvasLayout, type StartupCanvasLayout } from "./canvas";
import { companyName } from "./company-context/projection";
import { normalizeStartupProjectCopy, type StartupOSProject } from "./compiler";
import { isStartupOSFile, normalizeStartupProjectFiles, type StartupOSFile } from "./files";

const STARTUP_OS_SCENE_KIND = "nebutra.startup-os.project";
const STARTUP_OS_SCENE_VERSION = 1;
/** Keep the most recent N per-turn snapshots in the scene to bound growth. */
const SNAPSHOT_CAP = 50;
const STARTUP_OS_CANVAS_PREFIX = "startup-os:";

export type StartupOSEventType =
  | "project_created"
  | "review_approved"
  | "artifact_updated"
  | "file_updated"
  | "run_started"
  | "run_completed"
  | "run_failed"
  | "conversation_started"
  | "conversation_message"
  | "conversation_completed"
  | "conversation_failed";

export interface StartupOSEvent {
  readonly id: string;
  readonly type: StartupOSEventType;
  readonly projectId: string;
  readonly occurredAt: string;
  readonly actorId?: string;
  readonly summary: string;
  readonly metadata?: Record<string, unknown>;
}

export type StartupOSEventInput = Omit<StartupOSEvent, "id" | "projectId"> &
  Partial<Pick<StartupOSEvent, "id" | "projectId">>;

/** A pre-turn workspace snapshot, captured before a chat turn applies its file
 *  patches — the basis for "revert and resend" and undo. */
export interface StartupTurnSnapshot {
  readonly turnId: string;
  readonly prompt: string;
  readonly files: readonly StartupOSFile[];
  readonly createdAt: string;
}

export interface StartupOSProjectRecord {
  readonly project: StartupOSProject;
  readonly events: readonly StartupOSEvent[];
  readonly files?: readonly StartupOSFile[];
  readonly canvasLayout?: StartupCanvasLayout;
  readonly snapshots?: readonly StartupTurnSnapshot[];
}

export interface StartupOSSceneEnvelope {
  readonly kind: typeof STARTUP_OS_SCENE_KIND;
  readonly version: typeof STARTUP_OS_SCENE_VERSION;
  readonly project: StartupOSProject;
  readonly events: readonly StartupOSEvent[];
  readonly files?: readonly StartupOSFile[];
  readonly canvasLayout?: StartupCanvasLayout;
  readonly snapshots?: readonly StartupTurnSnapshot[];
}

interface AtelierCanvasRow {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly scene: unknown;
  readonly updatedAt: Date | string;
}

interface AtelierCanvasDelegate {
  findMany(args: {
    where: { tenantId: string; id: { startsWith: string } };
    orderBy: { updatedAt: "desc" };
  }): Promise<AtelierCanvasRow[]>;
  findUnique(args: {
    where: { tenantId_id: { tenantId: string; id: string } };
  }): Promise<AtelierCanvasRow | null>;
  upsert(args: {
    where: { tenantId_id: { tenantId: string; id: string } };
    create: {
      id: string;
      tenantId: string;
      name: string;
      scene: StartupOSSceneEnvelope;
      thumbnail: string | null;
    };
    update: {
      name: string;
      scene: StartupOSSceneEnvelope;
      thumbnail: string | null;
    };
  }): Promise<AtelierCanvasRow>;
}

export interface StartupOSDb {
  readonly atelierCanvas: AtelierCanvasDelegate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStartupOSProject(value: unknown): value is StartupOSProject {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.thesis === "string" &&
    isRecord(value.companyContext) &&
    Array.isArray(value.artifacts) &&
    Array.isArray(value.runs) &&
    Array.isArray(value.signals)
  );
}

export function toStartupOSCanvasId(projectId: string) {
  return `${STARTUP_OS_CANVAS_PREFIX}${projectId}`;
}

function eventId(projectId: string, type: StartupOSEventType, occurredAt: string, index: number) {
  const compactTime = occurredAt.replace(/[^0-9]/g, "").slice(0, 17) || "unknown";
  const compactProjectId = projectId.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `evt_${compactProjectId}_${type}_${compactTime}_${index + 1}`;
}

function isStartupOSEvent(value: unknown): value is StartupOSEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    [
      "project_created",
      "review_approved",
      "artifact_updated",
      "file_updated",
      "run_started",
      "run_completed",
      "run_failed",
      "conversation_started",
      "conversation_message",
      "conversation_completed",
      "conversation_failed",
    ].includes(value.type) &&
    typeof value.projectId === "string" &&
    typeof value.occurredAt === "string" &&
    typeof value.summary === "string" &&
    (value.actorId === undefined || typeof value.actorId === "string") &&
    (value.metadata === undefined || isRecord(value.metadata))
  );
}

function toStartupOSEvent(
  projectId: string,
  input: StartupOSEventInput,
  existingCount: number,
): StartupOSEvent {
  return {
    id: input.id ?? eventId(projectId, input.type, input.occurredAt, existingCount),
    type: input.type,
    projectId: input.projectId ?? projectId,
    occurredAt: input.occurredAt,
    ...(input.actorId ? { actorId: input.actorId } : {}),
    summary: input.summary,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
}

function isStartupTurnSnapshot(value: unknown): value is StartupTurnSnapshot {
  return (
    isRecord(value) &&
    typeof value.turnId === "string" &&
    typeof value.prompt === "string" &&
    typeof value.createdAt === "string" &&
    Array.isArray(value.files) &&
    value.files.every(isStartupOSFile)
  );
}

export function serializeStartupProjectScene(
  project: StartupOSProject,
  options?: {
    readonly events?: readonly StartupOSEvent[];
    readonly files?: readonly StartupOSFile[];
    readonly canvasLayout?: StartupCanvasLayout;
    readonly snapshots?: readonly StartupTurnSnapshot[];
  },
): StartupOSSceneEnvelope {
  return {
    kind: STARTUP_OS_SCENE_KIND,
    version: STARTUP_OS_SCENE_VERSION,
    project,
    events: options?.events ?? [],
    ...(options?.files ? { files: normalizeStartupProjectFiles(options.files) } : {}),
    ...(options?.canvasLayout ? { canvasLayout: options.canvasLayout } : {}),
    ...(options?.snapshots && options.snapshots.length > 0
      ? { snapshots: options.snapshots }
      : {}),
  };
}

export function parseStartupProjectSceneEnvelope(scene: unknown): StartupOSProjectRecord | null {
  if (!isRecord(scene)) return null;
  if (scene.kind !== STARTUP_OS_SCENE_KIND || scene.version !== STARTUP_OS_SCENE_VERSION) {
    return null;
  }
  if (!isStartupOSProject(scene.project)) return null;

  const canvasLayout = isStartupCanvasLayout(scene.canvasLayout) ? scene.canvasLayout : undefined;
  const files =
    scene.files === undefined
      ? undefined
      : Array.isArray(scene.files) && scene.files.every(isStartupOSFile)
        ? normalizeStartupProjectFiles(scene.files)
        : null;
  if (files === null) return null;

  const snapshots =
    Array.isArray(scene.snapshots) && scene.snapshots.every(isStartupTurnSnapshot)
      ? (scene.snapshots as StartupTurnSnapshot[])
      : undefined;

  if (scene.events === undefined) {
    return {
      project: normalizeStartupProjectCopy(scene.project),
      events: [],
      ...(files ? { files } : {}),
      ...(canvasLayout ? { canvasLayout } : {}),
      ...(snapshots ? { snapshots } : {}),
    };
  }
  if (!Array.isArray(scene.events) || !scene.events.every(isStartupOSEvent)) {
    return null;
  }

  return {
    project: normalizeStartupProjectCopy(scene.project),
    events: scene.events,
    ...(files ? { files } : {}),
    ...(canvasLayout ? { canvasLayout } : {}),
    ...(snapshots ? { snapshots } : {}),
  };
}

export function parseStartupProjectScene(scene: unknown): StartupOSProject | null {
  return parseStartupProjectSceneEnvelope(scene)?.project ?? null;
}

function toProject(row: AtelierCanvasRow): StartupOSProject | null {
  return parseStartupProjectScene(row.scene);
}

function toProjectRecord(row: AtelierCanvasRow): StartupOSProjectRecord | null {
  return parseStartupProjectSceneEnvelope(row.scene);
}

export async function listStartupProjects(
  db: StartupOSDb,
  tenantId: string,
): Promise<StartupOSProject[]> {
  const rows = await db.atelierCanvas.findMany({
    where: { tenantId, id: { startsWith: STARTUP_OS_CANVAS_PREFIX } },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map(toProject).filter((project): project is StartupOSProject => Boolean(project));
}

export async function getStartupProject(
  db: StartupOSDb,
  tenantId: string,
  projectId: string,
): Promise<StartupOSProject | null> {
  return (await getStartupProjectRecord(db, tenantId, projectId))?.project ?? null;
}

export async function getStartupProjectRecord(
  db: StartupOSDb,
  tenantId: string,
  projectId: string,
): Promise<StartupOSProjectRecord | null> {
  const row = await db.atelierCanvas.findUnique({
    where: { tenantId_id: { tenantId, id: toStartupOSCanvasId(projectId) } },
  });

  return row ? toProjectRecord(row) : null;
}

export async function saveStartupProjectRecord(
  db: StartupOSDb,
  tenantId: string,
  project: StartupOSProject,
  options?: {
    readonly event?: StartupOSEventInput;
    readonly events?: readonly StartupOSEventInput[];
    readonly files?: readonly StartupOSFile[];
    readonly canvasLayout?: StartupCanvasLayout;
    readonly snapshot?: StartupTurnSnapshot;
  },
): Promise<StartupOSProjectRecord> {
  const existing = await getStartupProjectRecord(db, tenantId, project.id);
  const existingEvents = existing?.events ?? [];
  const inputEvents = [...(options?.event ? [options.event] : []), ...(options?.events ?? [])];
  const events =
    inputEvents.length > 0
      ? [
          ...existingEvents,
          ...inputEvents.map((event, index) =>
            toStartupOSEvent(project.id, event, existingEvents.length + index),
          ),
        ]
      : existingEvents;
  const files = options?.files ? normalizeStartupProjectFiles(options.files) : existing?.files;
  const canvasLayout = options?.canvasLayout ?? existing?.canvasLayout;
  const snapshots = options?.snapshot
    ? [...(existing?.snapshots ?? []), options.snapshot].slice(-SNAPSHOT_CAP)
    : existing?.snapshots;
  const scene = serializeStartupProjectScene(project, {
    events,
    ...(files ? { files } : {}),
    ...(canvasLayout ? { canvasLayout } : {}),
    ...(snapshots ? { snapshots } : {}),
  });
  const row = await db.atelierCanvas.upsert({
    where: { tenantId_id: { tenantId, id: toStartupOSCanvasId(project.id) } },
    create: {
      id: toStartupOSCanvasId(project.id),
      tenantId,
      name: companyName(project.companyContext),
      scene,
      thumbnail: null,
    },
    update: {
      name: companyName(project.companyContext),
      scene,
      thumbnail: null,
    },
  });

  const saved = toProjectRecord(row);
  if (!saved) {
    throw new Error("Startup OS project failed to round-trip through AtelierCanvas");
  }
  return saved;
}

export async function saveStartupProject(
  db: StartupOSDb,
  tenantId: string,
  project: StartupOSProject,
  options?: {
    readonly event?: StartupOSEventInput;
    readonly events?: readonly StartupOSEventInput[];
    readonly files?: readonly StartupOSFile[];
    readonly canvasLayout?: StartupCanvasLayout;
  },
): Promise<StartupOSProject> {
  return (await saveStartupProjectRecord(db, tenantId, project, options)).project;
}

export async function saveStartupCanvasLayout(
  db: StartupOSDb,
  tenantId: string,
  projectId: string,
  canvasLayout: StartupCanvasLayout,
): Promise<StartupOSProjectRecord> {
  const existing = await getStartupProjectRecord(db, tenantId, projectId);
  if (!existing) {
    throw new Error("Startup OS project not found.");
  }
  return saveStartupProjectRecord(db, tenantId, existing.project, { canvasLayout });
}

export async function saveStartupProjectFiles(
  db: StartupOSDb,
  tenantId: string,
  projectId: string,
  files: readonly StartupOSFile[],
  event?: StartupOSEventInput,
): Promise<StartupOSProjectRecord> {
  const existing = await getStartupProjectRecord(db, tenantId, projectId);
  if (!existing) {
    throw new Error("Startup OS project not found.");
  }
  return saveStartupProjectRecord(db, tenantId, existing.project, {
    files,
    ...(event ? { event } : {}),
  });
}

import { describe, expect, it } from "vitest";
import { compileStartupProject } from "../compiler";
import { buildStartupProjectFiles, patchStartupProjectFile } from "../files";
import {
  getStartupProjectRecord,
  parseStartupProjectScene,
  parseStartupProjectSceneEnvelope,
  type StartupOSDb,
  type StartupOSEvent,
  saveStartupCanvasLayout,
  saveStartupProject,
  saveStartupProjectFiles,
  serializeStartupProjectScene,
  toStartupOSCanvasId,
} from "../store";

function createMemoryDb(): StartupOSDb {
  const rows = new Map<
    string,
    {
      id: string;
      organizationId: string;
      name: string;
      scene: unknown;
      updatedAt: Date;
    }
  >();

  return {
    atelierCanvas: {
      async findMany(args) {
        return Array.from(rows.values())
          .filter(
            (row) =>
              row.organizationId === args.where.organizationId &&
              row.id.startsWith(args.where.id.startsWith),
          )
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
      },
      async findUnique(args) {
        return (
          rows.get(
            `${args.where.organizationId_id.organizationId}:${args.where.organizationId_id.id}`,
          ) ?? null
        );
      },
      async upsert(args) {
        const key = `${args.where.organizationId_id.organizationId}:${args.where.organizationId_id.id}`;
        const existing = rows.get(key);
        const row = {
          id: existing?.id ?? args.create.id,
          organizationId: existing?.organizationId ?? args.create.organizationId,
          name: args.update.name,
          scene: args.update.scene,
          updatedAt: new Date(),
        };
        rows.set(key, row);
        return row;
      },
    },
  };
}

describe("Startup OS AtelierCanvas persistence contract", () => {
  it("round-trips a compiled Startup Project through a real scene envelope", () => {
    const project = compileStartupProject({
      thesis: "A founder OS that connects launch, revenue, and support into one company state.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    const scene = serializeStartupProjectScene(project);
    const parsed = parseStartupProjectScene(scene);

    expect(toStartupOSCanvasId(project.id)).toBe(`startup-os:${project.id}`);
    expect(scene).toMatchObject({
      kind: "nebutra.startup-os.project",
      version: 1,
      project: { id: project.id },
    });
    expect(parsed).toEqual(project);
  });

  it("defaults legacy serialized scenes to an empty event trail", () => {
    const project = compileStartupProject({
      thesis: "A founder OS that connects launch, revenue, and support into one company state.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const legacyScene = {
      kind: "nebutra.startup-os.project",
      version: 1,
      project,
    };

    expect(parseStartupProjectSceneEnvelope(legacyScene)).toEqual({
      project,
      events: [],
    });
  });

  it("normalizes legacy fallback company copy when reading a persisted scene", () => {
    const project = compileStartupProject({
      thesis: "A founder OS that persists every generated file through the tenant scene.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const legacyProject = {
      ...project,
      companyContext: {
        ...project.companyContext,
        promise: `${project.companyContext.name} turns a raw startup thesis into a company state that agents can safely mutate.`,
      },
    };

    const parsed = parseStartupProjectSceneEnvelope({
      kind: "nebutra.startup-os.project",
      version: 1,
      project: legacyProject,
    });

    expect(parsed?.project.companyContext.promise).toBe(
      "A founder OS that persists every generated file through the tenant scene.",
    );
  });

  it("round-trips explicit project events inside the scene envelope", () => {
    const project = compileStartupProject({
      thesis: "A founder OS that connects launch, revenue, and support into one company state.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const events: StartupOSEvent[] = [
      {
        id: "evt_startup_project_created_20260529000000",
        type: "project_created",
        projectId: project.id,
        occurredAt: "2026-05-29T00:00:00.000Z",
        actorId: "user_123",
        summary: "Compiled Startup OS project from founder thesis.",
      },
    ];

    const scene = serializeStartupProjectScene(project, { events });

    expect(parseStartupProjectSceneEnvelope(scene)).toEqual({
      project,
      events,
    });
  });

  it("round-trips generated project files inside the scene envelope", () => {
    const project = compileStartupProject({
      thesis: "A founder OS that generates a real editable app workspace.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const files = buildStartupProjectFiles(project);

    const scene = serializeStartupProjectScene(project, { files });

    expect(parseStartupProjectSceneEnvelope(scene)).toMatchObject({
      project,
      files: expect.arrayContaining([
        expect.objectContaining({ path: "index.html" }),
        expect.objectContaining({ path: "src/App.tsx" }),
      ]),
    });
  });

  it("round-trips a persisted canvas layout without losing project events", async () => {
    const db = createMemoryDb();
    const project = compileStartupProject({
      thesis: "A founder OS that keeps the company canvas spatially stable.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    await saveStartupProject(db, "org_123", project, {
      event: {
        type: "project_created",
        occurredAt: "2026-05-29T00:00:00.000Z",
        actorId: "user_123",
        summary: "Compiled Startup OS project from founder thesis.",
      },
    });
    await saveStartupCanvasLayout(db, "org_123", project.id, {
      zoom: 0.94,
      updatedAt: "2026-05-29T00:03:00.000Z",
      nodePositions: {
        "startup-canvas:company-context": { x: 72, y: 128 },
        [`artifact:${project.artifacts[0]?.id}`]: { x: 390, y: 88 },
      },
    });

    const record = await getStartupProjectRecord(db, "org_123", project.id);

    expect(record?.events.map((event) => event.type)).toEqual(["project_created"]);
    expect(record?.canvasLayout).toMatchObject({
      zoom: 0.94,
      nodePositions: {
        "startup-canvas:company-context": { x: 72, y: 128 },
      },
    });
  });

  it("persists user-edited files without dropping events or canvas layout", async () => {
    const db = createMemoryDb();
    const project = compileStartupProject({
      thesis: "A founder OS that keeps code edits in the tenant scene.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const files = buildStartupProjectFiles(project);

    await saveStartupProject(db, "org_123", project, {
      files,
      event: {
        type: "project_created",
        occurredAt: "2026-05-29T00:00:00.000Z",
        actorId: "user_123",
        summary: "Compiled Startup OS project from founder thesis.",
      },
      canvasLayout: {
        zoom: 0.94,
        updatedAt: "2026-05-29T00:03:00.000Z",
        nodePositions: {
          "startup-canvas:company-context": { x: 72, y: 128 },
        },
      },
    });
    await saveStartupProjectFiles(
      db,
      "org_123",
      project.id,
      patchStartupProjectFile(files, {
        path: "README.md",
        content: "# Edited startup",
        updatedAt: "2026-05-29T01:00:00.000Z",
      }),
      {
        type: "file_updated",
        occurredAt: "2026-05-29T01:00:00.000Z",
        actorId: "user_123",
        summary: "Updated README.md.",
      },
    );

    const record = await getStartupProjectRecord(db, "org_123", project.id);

    expect(record?.events.map((event) => event.type)).toEqual(["project_created", "file_updated"]);
    expect(record?.canvasLayout?.zoom).toBe(0.94);
    expect(record?.files?.find((file) => file.path === "README.md")?.content).toBe(
      "# Edited startup",
    );
  });

  it("preserves existing events and appends save events in the tenant scene", async () => {
    const db = createMemoryDb();
    const project = compileStartupProject({
      thesis: "A founder OS that connects launch, revenue, and support into one company state.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    await saveStartupProject(db, "org_123", project, {
      event: {
        type: "project_created",
        occurredAt: "2026-05-29T00:00:00.000Z",
        actorId: "user_123",
        summary: "Compiled Startup OS project from founder thesis.",
      },
    });
    await saveStartupProject(
      db,
      "org_123",
      { ...project, status: "review_ready" },
      {
        event: {
          type: "review_approved",
          occurredAt: "2026-05-29T00:01:00.000Z",
          actorId: "user_123",
          summary: "Approved governance review gate.",
        },
      },
    );

    const record = await getStartupProjectRecord(db, "org_123", project.id);

    expect(record?.events.map((event) => event.type)).toEqual([
      "project_created",
      "review_approved",
    ]);
    expect(record?.events).toMatchObject([{ projectId: project.id }, { projectId: project.id }]);
  });

  it("appends multiple execution events from one save without dropping order", async () => {
    const db = createMemoryDb();
    const project = compileStartupProject({
      thesis: "A founder OS that connects launch, revenue, and support into one company state.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    await saveStartupProject(db, "org_123", project, {
      events: [
        {
          type: "run_started",
          occurredAt: "2026-05-29T00:01:00.000Z",
          actorId: "user_123",
          summary: "Started landing.draft.",
        },
        {
          type: "run_completed",
          occurredAt: "2026-05-29T00:02:00.000Z",
          actorId: "user_123",
          summary: "Completed landing.draft.",
        },
      ],
    });

    const record = await getStartupProjectRecord(db, "org_123", project.id);

    expect(record?.events.map((event) => event.type)).toEqual(["run_started", "run_completed"]);
  });

  it("uses explicit project ids to persist same-thesis projects without overwriting", async () => {
    const db = createMemoryDb();
    const thesis =
      "A founder OS that connects launch, revenue, and support into one company state.";
    const firstProject = compileStartupProject({
      id: "startup_unique_first",
      thesis,
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const secondProject = compileStartupProject({
      id: "startup_unique_second",
      thesis,
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    await saveStartupProject(db, "org_123", firstProject);
    await saveStartupProject(db, "org_123", secondProject);

    expect(await getStartupProjectRecord(db, "org_123", firstProject.id)).toMatchObject({
      project: { id: "startup_unique_first" },
    });
    expect(await getStartupProjectRecord(db, "org_123", secondProject.id)).toMatchObject({
      project: { id: "startup_unique_second" },
    });
  });

  it("rejects non Startup OS canvas scenes instead of treating them as projects", () => {
    expect(parseStartupProjectScene({ elements: [], files: [] })).toBeNull();
    expect(parseStartupProjectScene(null)).toBeNull();
    expect(parseStartupProjectSceneEnvelope({ elements: [], files: [] })).toBeNull();
  });
});

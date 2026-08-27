# Startup OS Project Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the missing Bolt/Lovable-grade project lifecycle infrastructure for Startup OS: recoverable versions, project actions, export, sandbox preview handoff, and governed publish/visibility controls.

**Architecture:** Keep the first wave inside the existing Startup OS boundary and `AtelierCanvas.scene` envelope so the feature remains keyless-testable and low-risk. Introduce explicit pure modules for snapshot/action policy before adding UI, then graduate sandbox and publish work through provider interfaces instead of hardcoding one deployment substrate.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod, Vitest, Prisma-backed `AtelierCanvas`, `@nebutra/audit`, `@nebutra/uploads`, `@nebutra/sandbox-runtime`, `@nebutra/ui`, `@nebutra/icons`.

---

## Scope and Ordering

This plan deliberately does not start with "Publish" because publish is the highest-risk external side effect. The convergence order is:

1. **Recoverability first:** version snapshots and restore make every later mutation safer.
2. **Project actions second:** rename/duplicate/delete semantics become ordinary audited mutations.
3. **Export third:** zip/download is useful without live infrastructure and proves file packaging.
4. **Sandbox preview fourth:** replace `iframe srcDoc / no deploy` with a provider seam.
5. **Publish last:** gated visibility and deployment controls only after preview and audit are dependable.

## Current Surface Map

- Existing project list/create: `apps/web/src/app/api/startup-os/projects/route.ts`
- Existing project detail: `apps/web/src/app/api/startup-os/projects/[projectId]/route.ts`
- Existing file GET/PATCH: `apps/web/src/app/api/startup-os/projects/[projectId]/files/route.ts`
- Existing chat/SSE: `apps/web/src/app/api/startup-os/projects/[projectId]/chat/route.ts`
- Existing persistence envelope: `apps/web/src/lib/startup-os/store.ts`
- Existing generated files/preview: `apps/web/src/lib/startup-os/files.ts`
- Existing UI shell: `apps/web/src/components/startup-os/startup-command-center.tsx`
- Existing code/file UI: `apps/web/src/components/startup-os/startup-os-code-view.tsx`, `apps/web/src/components/startup-os/startup-os-file-tree.tsx`

## Best-Practice Rules

- No generated-project mutation may be non-recoverable after Task 1.
- No external publish/deploy action runs inside a UI component; everything goes through an API route and an injected provider interface.
- No fake public status. If a project has no deployment, the UI says "Preview only"; it does not imply public availability.
- Every state transition appends a Startup OS event and, for externally meaningful actions, an `@nebutra/audit` record.
- Unit tests stay keyless. Provider-backed tests inject fake adapters.
- UI uses `@nebutra/ui`, `@nebutra/icons`, tokens, and `AnimateIn`; no raw `motion.div`, no raw hex colors.

---

### Task 1: Version Snapshot Model

**Files:**
- Create: `apps/web/src/lib/startup-os/versions.ts`
- Create: `apps/web/src/lib/startup-os/__tests__/versions.test.ts`
- Modify: `apps/web/src/lib/startup-os/store.ts`

- [ ] **Step 1: Write failing tests for snapshot creation and restore**

Create `apps/web/src/lib/startup-os/__tests__/versions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { StartupOSProject } from "../compiler";
import type { StartupOSFile } from "../files";
import {
  createStartupProjectSnapshot,
  restoreStartupProjectSnapshot,
  type StartupProjectSnapshot,
} from "../versions";

const project = {
  id: "startup_1",
  slug: "acme-os",
  thesis: "A usage-metered API gateway for AI apps",
  arena: "Developer infrastructure",
  status: "compiled",
  createdAt: "2026-06-05T00:00:00.000Z",
  updatedAt: "2026-06-05T00:00:00.000Z",
  companyContext: {
    layers: [],
    projectId: "startup_1",
    stage: "pre_seed",
    updatedAt: "2026-06-05T00:00:00.000Z",
  },
  artifacts: [],
  runs: [],
  signals: [],
} satisfies StartupOSProject;

const files = [
  {
    path: "src/routes/index.tsx",
    kind: "source",
    language: "tsx",
    content: "export const Route = {};",
    generatedFrom: "compiler",
    updatedAt: "2026-06-05T00:00:00.000Z",
  },
] satisfies StartupOSFile[];

describe("startup-os versions", () => {
  it("creates an immutable snapshot with project, files, and canvas state", () => {
    const snapshot = createStartupProjectSnapshot({
      project,
      files,
      canvasLayout: { nodePositions: { a: { x: 1, y: 2 } }, zoom: 0.8 },
      actorId: "user_1",
      label: "Before pricing-page change",
      now: () => "2026-06-05T01:00:00.000Z",
    });

    expect(snapshot.id).toBe("snap_startup_1_20260605010000000");
    expect(snapshot.label).toBe("Before pricing-page change");
    expect(snapshot.fileCount).toBe(1);
    expect(snapshot.actorId).toBe("user_1");
    expect(snapshot.project.thesis).toBe(project.thesis);
    expect(snapshot.files[0]?.path).toBe("src/routes/index.tsx");
  });

  it("restores project/files/canvas from a snapshot", () => {
    const snapshot: StartupProjectSnapshot = createStartupProjectSnapshot({
      project,
      files,
      actorId: "user_1",
      label: "Manual checkpoint",
      now: () => "2026-06-05T01:00:00.000Z",
    });

    const restored = restoreStartupProjectSnapshot(snapshot);

    expect(restored.project).toEqual(snapshot.project);
    expect(restored.files).toEqual(snapshot.files);
    expect(restored.canvasLayout).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os/__tests__/versions.test.ts
```

Expected: FAIL because `../versions` does not exist.

- [ ] **Step 3: Implement the pure snapshot module**

Create `apps/web/src/lib/startup-os/versions.ts`:

```ts
import type { StartupCanvasLayout } from "./canvas";
import { normalizeStartupProjectCopy, type StartupOSProject } from "./compiler";
import { normalizeStartupProjectFiles, type StartupOSFile } from "./files";

export const STARTUP_OS_SNAPSHOT_VERSION = 1;

export interface StartupProjectSnapshot {
  readonly id: string;
  readonly version: typeof STARTUP_OS_SNAPSHOT_VERSION;
  readonly projectId: string;
  readonly label: string;
  readonly createdAt: string;
  readonly actorId?: string;
  readonly project: StartupOSProject;
  readonly files: readonly StartupOSFile[];
  readonly fileCount: number;
  readonly canvasLayout?: StartupCanvasLayout;
}

export interface CreateStartupProjectSnapshotInput {
  readonly project: StartupOSProject;
  readonly files?: readonly StartupOSFile[];
  readonly canvasLayout?: StartupCanvasLayout;
  readonly actorId?: string;
  readonly label?: string;
  readonly now?: () => string;
}

function snapshotId(projectId: string, occurredAt: string) {
  const compactTime = occurredAt.replace(/[^0-9]/g, "").slice(0, 17) || "unknown";
  return `snap_${projectId}_${compactTime}`;
}

export function createStartupProjectSnapshot(
  input: CreateStartupProjectSnapshotInput,
): StartupProjectSnapshot {
  const createdAt = input.now?.() ?? new Date().toISOString();
  const files = normalizeStartupProjectFiles(input.files ?? []);
  return {
    id: snapshotId(input.project.id, createdAt),
    version: STARTUP_OS_SNAPSHOT_VERSION,
    projectId: input.project.id,
    label: input.label?.trim() || "Project checkpoint",
    createdAt,
    ...(input.actorId ? { actorId: input.actorId } : {}),
    project: normalizeStartupProjectCopy(input.project),
    files,
    fileCount: files.length,
    ...(input.canvasLayout ? { canvasLayout: input.canvasLayout } : {}),
  };
}

export function restoreStartupProjectSnapshot(snapshot: StartupProjectSnapshot): {
  readonly project: StartupOSProject;
  readonly files: readonly StartupOSFile[];
  readonly canvasLayout?: StartupCanvasLayout;
} {
  return {
    project: normalizeStartupProjectCopy(snapshot.project),
    files: normalizeStartupProjectFiles(snapshot.files),
    ...(snapshot.canvasLayout ? { canvasLayout: snapshot.canvasLayout } : {}),
  };
}
```

- [ ] **Step 4: Extend the store envelope**

Modify `apps/web/src/lib/startup-os/store.ts`:

```ts
import type { StartupProjectSnapshot } from "./versions";
```

Extend `StartupOSProjectRecord` and `StartupOSSceneEnvelope`:

```ts
readonly snapshots?: readonly StartupProjectSnapshot[];
```

Extend `serializeStartupProjectScene` options:

```ts
readonly snapshots?: readonly StartupProjectSnapshot[];
```

When serializing, include:

```ts
...(options?.snapshots ? { snapshots: options.snapshots } : {}),
```

When parsing, accept only arrays of snapshot-shaped records:

```ts
const snapshots =
  scene.snapshots === undefined
    ? undefined
    : Array.isArray(scene.snapshots)
      ? (scene.snapshots as readonly StartupProjectSnapshot[])
      : null;
if (snapshots === null) return null;
```

Then include snapshots in the returned record:

```ts
...(snapshots ? { snapshots } : {}),
```

Finally, extend `saveStartupProjectRecord` options and pass existing snapshots through when no new snapshots are supplied:

```ts
readonly snapshots?: readonly StartupProjectSnapshot[];
```

```ts
const snapshots = options?.snapshots ?? existing?.snapshots;
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os/__tests__/versions.test.ts apps/web/src/lib/startup-os/__tests__/store.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/startup-os/versions.ts apps/web/src/lib/startup-os/__tests__/versions.test.ts apps/web/src/lib/startup-os/store.ts
git commit -m "feat(startup-os): add project snapshots"
```

---

### Task 2: Version History API

**Files:**
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/versions/route.ts`
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/versions/[snapshotId]/restore/route.ts`
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/versions/__tests__/route.test.ts`
- Modify: `apps/web/src/lib/startup-os/store.ts`

- [ ] **Step 1: Write route tests for list, create, and restore**

Create `apps/web/src/app/api/startup-os/projects/[projectId]/versions/__tests__/route.test.ts` with the same auth/mock style used by sibling Startup OS route tests. Required assertions:

```ts
expect(listResponse.status).toBe(200);
expect(await listResponse.json()).toMatchObject({ snapshots: [] });
expect(createResponse.status).toBe(201);
expect(createPayload.snapshot.label).toBe("Before pricing");
expect(restoreResponse.status).toBe(200);
expect(restorePayload.project.id).toBe("startup_1");
expect(restorePayload.events.at(-1).type).toBe("version_restored");
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/app/api/startup-os/projects/[projectId]/versions/__tests__/route.test.ts
```

Expected: FAIL because routes do not exist and `version_restored` is not an allowed event.

- [ ] **Step 3: Add event types**

Modify `StartupOSEventType` in `apps/web/src/lib/startup-os/store.ts`:

```ts
| "version_created"
| "version_restored"
```

Add both strings to the `isStartupOSEvent` allowlist.

- [ ] **Step 4: Implement `GET` and `POST /versions`**

Create `apps/web/src/app/api/startup-os/projects/[projectId]/versions/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import { refreshCompilerGeneratedStartupFiles } from "@/lib/startup-os/files";
import { getStartupProjectRecord, saveStartupProjectRecord, type StartupOSDb } from "@/lib/startup-os/store";
import { createStartupProjectSnapshot } from "@/lib/startup-os/versions";

export const dynamic = "force-dynamic";

const CreateSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
});

interface RouteContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

async function getContext(request: Request, scope: "project:read" | "project:update") {
  if (!isStartupOSPrototypeEnabled()) {
    return { response: NextResponse.json({ error: "Startup OS is not enabled." }, { status: 404 }) } as const;
  }
  const auth = await getAuth(request);
  if (!auth.isSignedIn || !auth.userId) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  if (!auth.orgId) return { response: NextResponse.json({ error: "Organization required." }, { status: 403 }) } as const;
  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, scope)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  return { auth, orgId: auth.orgId, userId: auth.userId, db: getTenantDb(auth.orgId) as unknown as StartupOSDb } as const;
}

export async function GET(request: Request, context: RouteContext) {
  const ctx = await getContext(request, "project:read");
  if ("response" in ctx) return ctx.response;
  const { projectId } = await context.params;
  const record = await getStartupProjectRecord(ctx.db, ctx.orgId, decodeURIComponent(projectId));
  if (!record) return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
  return NextResponse.json({ snapshots: record.snapshots ?? [] });
}

export async function POST(request: Request, context: RouteContext) {
  const ctx = await getContext(request, "project:update");
  if ("response" in ctx) return ctx.response;
  const body = await request.json().catch(() => null);
  const parsed = CreateSnapshotSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  const { projectId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);
  const record = await getStartupProjectRecord(ctx.db, ctx.orgId, decodedProjectId);
  if (!record) return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
  const files = refreshCompilerGeneratedStartupFiles(record.project, record.files);
  const snapshot = createStartupProjectSnapshot({
    project: record.project,
    files,
    canvasLayout: record.canvasLayout,
    actorId: ctx.userId,
    label: parsed.data.label,
  });
  const saved = await saveStartupProjectRecord(ctx.db, ctx.orgId, record.project, {
    files,
    canvasLayout: record.canvasLayout,
    snapshots: [snapshot, ...(record.snapshots ?? [])].slice(0, 50),
    event: {
      type: "version_created",
      occurredAt: snapshot.createdAt,
      actorId: ctx.userId,
      summary: `Created version ${snapshot.label}.`,
      metadata: { snapshotId: snapshot.id },
    },
  });
  return NextResponse.json({ snapshot, snapshots: saved.snapshots ?? [] }, { status: 201 });
}
```

- [ ] **Step 5: Implement restore route**

Create `apps/web/src/app/api/startup-os/projects/[projectId]/versions/[snapshotId]/restore/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import { buildStartupPreviewHtml } from "@/lib/startup-os/files";
import { getStartupProjectRecord, saveStartupProjectRecord, type StartupOSDb } from "@/lib/startup-os/store";
import { createStartupProjectSnapshot, restoreStartupProjectSnapshot } from "@/lib/startup-os/versions";

export const dynamic = "force-dynamic";

interface RouteContext {
  readonly params: Promise<{ readonly projectId: string; readonly snapshotId: string }>;
}

async function getContext(request: Request) {
  if (!isStartupOSPrototypeEnabled()) return { response: NextResponse.json({ error: "Startup OS is not enabled." }, { status: 404 }) } as const;
  const auth = await getAuth(request);
  if (!auth.isSignedIn || !auth.userId) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  if (!auth.orgId) return { response: NextResponse.json({ error: "Organization required." }, { status: 403 }) } as const;
  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "project:update")) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  return { auth, orgId: auth.orgId, userId: auth.userId, db: getTenantDb(auth.orgId) as unknown as StartupOSDb } as const;
}

export async function POST(request: Request, context: RouteContext) {
  const ctx = await getContext(request);
  if ("response" in ctx) return ctx.response;
  const { projectId, snapshotId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);
  const decodedSnapshotId = decodeURIComponent(snapshotId);
  const record = await getStartupProjectRecord(ctx.db, ctx.orgId, decodedProjectId);
  if (!record) return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
  const snapshot = (record.snapshots ?? []).find((item) => item.id === decodedSnapshotId);
  if (!snapshot) return NextResponse.json({ error: "Startup OS version not found." }, { status: 404 });
  const beforeRestore = createStartupProjectSnapshot({
    project: record.project,
    files: record.files,
    canvasLayout: record.canvasLayout,
    actorId: ctx.userId,
    label: "Before restore",
  });
  const restored = restoreStartupProjectSnapshot(snapshot);
  const saved = await saveStartupProjectRecord(ctx.db, ctx.orgId, restored.project, {
    files: restored.files,
    canvasLayout: restored.canvasLayout,
    snapshots: [beforeRestore, ...(record.snapshots ?? [])].slice(0, 50),
    event: {
      type: "version_restored",
      occurredAt: new Date().toISOString(),
      actorId: ctx.userId,
      summary: `Restored version ${snapshot.label}.`,
      metadata: { snapshotId: snapshot.id },
    },
  });
  return NextResponse.json({
    ...saved,
    previewHtml: buildStartupPreviewHtml(saved.files ?? restored.files),
  });
}
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/app/api/startup-os/projects/[projectId]/versions/__tests__/route.test.ts apps/web/src/lib/startup-os/__tests__/store.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/startup-os/projects/[projectId]/versions apps/web/src/lib/startup-os/store.ts
git commit -m "feat(startup-os): add version history api"
```

---

### Task 3: Project Actions API

**Files:**
- Create: `apps/web/src/lib/startup-os/project-actions.ts`
- Create: `apps/web/src/lib/startup-os/__tests__/project-actions.test.ts`
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/actions/route.ts`
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/actions/__tests__/route.test.ts`
- Modify: `apps/web/src/lib/startup-os/store.ts`

- [ ] **Step 1: Write pure tests for rename and duplicate**

Create `apps/web/src/lib/startup-os/__tests__/project-actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { StartupOSProject } from "../compiler";
import { duplicateStartupProject, renameStartupProject } from "../project-actions";

const project = {
  id: "startup_1",
  slug: "old-name",
  thesis: "A usage-metered API gateway for AI apps",
  arena: "Developer infrastructure",
  status: "compiled",
  createdAt: "2026-06-05T00:00:00.000Z",
  updatedAt: "2026-06-05T00:00:00.000Z",
  companyContext: {
    layers: [],
    projectId: "startup_1",
    stage: "pre_seed",
    updatedAt: "2026-06-05T00:00:00.000Z",
  },
  artifacts: [],
  runs: [],
  signals: [],
} satisfies StartupOSProject;

describe("startup-os project actions", () => {
  it("renames a project without changing its id", () => {
    const renamed = renameStartupProject(project, {
      name: "New Name",
      now: () => "2026-06-05T02:00:00.000Z",
    });
    expect(renamed.id).toBe(project.id);
    expect(renamed.slug).toBe("new-name");
    expect(renamed.updatedAt).toBe("2026-06-05T02:00:00.000Z");
  });

  it("duplicates a project into a new id and slug", () => {
    const duplicated = duplicateStartupProject(project, {
      id: "startup_2",
      name: "Copy",
      now: () => "2026-06-05T02:00:00.000Z",
    });
    expect(duplicated.id).toBe("startup_2");
    expect(duplicated.slug).toBe("copy");
    expect(duplicated.createdAt).toBe("2026-06-05T02:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os/__tests__/project-actions.test.ts
```

Expected: FAIL because `project-actions.ts` does not exist.

- [ ] **Step 3: Implement pure actions**

Create `apps/web/src/lib/startup-os/project-actions.ts`:

```ts
import { normalizeStartupProjectCopy, type StartupOSProject } from "./compiler";

function slugify(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "startup-project";
}

export function renameStartupProject(
  project: StartupOSProject,
  input: { readonly name: string; readonly now?: () => string },
): StartupOSProject {
  return {
    ...normalizeStartupProjectCopy(project),
    slug: slugify(input.name),
    updatedAt: input.now?.() ?? new Date().toISOString(),
  };
}

export function duplicateStartupProject(
  project: StartupOSProject,
  input: { readonly id: string; readonly name: string; readonly now?: () => string },
): StartupOSProject {
  const now = input.now?.() ?? new Date().toISOString();
  return {
    ...normalizeStartupProjectCopy(project),
    id: input.id,
    slug: slugify(input.name),
    createdAt: now,
    updatedAt: now,
  };
}
```

- [ ] **Step 4: Add delete support in the store**

Modify `apps/web/src/lib/startup-os/store.ts` by extending `AtelierCanvasDelegate`:

```ts
delete(args: { where: { tenantId_id: { tenantId: string; id: string } } }): Promise<AtelierCanvasRow>;
```

Add:

```ts
export async function deleteStartupProject(
  db: StartupOSDb,
  tenantId: string,
  projectId: string,
): Promise<void> {
  await db.atelierCanvas.delete({
    where: { tenantId_id: { tenantId, id: toStartupOSCanvasId(projectId) } },
  });
}
```

- [ ] **Step 5: Implement action route**

Create `apps/web/src/app/api/startup-os/projects/[projectId]/actions/route.ts` with `POST` body:

```ts
type RenameBody = { action: "rename"; name: string };
type DuplicateBody = { action: "duplicate"; name: string };
type DeleteBody = { action: "delete"; confirmProjectId: string };
```

Behavior:

- `rename`: create a pre-action snapshot, save renamed project, append `project_renamed`.
- `duplicate`: save duplicated project with copied files and snapshots reset to one `project_created` event.
- `delete`: require `confirmProjectId === projectId`, audit, then delete.

- [ ] **Step 6: Add event types**

Add to `StartupOSEventType` and allowlist:

```ts
| "project_renamed"
| "project_duplicated"
| "project_deleted"
```

- [ ] **Step 7: Run tests**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os/__tests__/project-actions.test.ts apps/web/src/app/api/startup-os/projects/[projectId]/actions/__tests__/route.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/startup-os/project-actions.ts apps/web/src/lib/startup-os/__tests__/project-actions.test.ts apps/web/src/app/api/startup-os/projects/[projectId]/actions apps/web/src/lib/startup-os/store.ts
git commit -m "feat(startup-os): add project lifecycle actions"
```

---

### Task 4: Export API

**Files:**
- Create: `apps/web/src/lib/startup-os/export.ts`
- Create: `apps/web/src/lib/startup-os/__tests__/export.test.ts`
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/export/route.ts`
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/export/__tests__/route.test.ts`

- [ ] **Step 1: Write export package tests**

Create `apps/web/src/lib/startup-os/__tests__/export.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildStartupExportManifest } from "../export";

describe("startup-os export", () => {
  it("creates a portable manifest for generated files", () => {
    const manifest = buildStartupExportManifest({
      projectId: "startup_1",
      projectSlug: "acme-os",
      fileCount: 2,
      createdAt: "2026-06-05T03:00:00.000Z",
    });

    expect(manifest).toEqual({
      kind: "nebutra.startup-os.export",
      version: 1,
      projectId: "startup_1",
      projectSlug: "acme-os",
      fileCount: 2,
      createdAt: "2026-06-05T03:00:00.000Z",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os/__tests__/export.test.ts
```

Expected: FAIL because `export.ts` does not exist.

- [ ] **Step 3: Implement manifest builder**

Create `apps/web/src/lib/startup-os/export.ts`:

```ts
export const STARTUP_OS_EXPORT_VERSION = 1;

export interface StartupExportManifest {
  readonly kind: "nebutra.startup-os.export";
  readonly version: typeof STARTUP_OS_EXPORT_VERSION;
  readonly projectId: string;
  readonly projectSlug: string;
  readonly fileCount: number;
  readonly createdAt: string;
}

export function buildStartupExportManifest(input: {
  readonly projectId: string;
  readonly projectSlug: string;
  readonly fileCount: number;
  readonly createdAt?: string;
}): StartupExportManifest {
  return {
    kind: "nebutra.startup-os.export",
    version: STARTUP_OS_EXPORT_VERSION,
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    fileCount: input.fileCount,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
```

- [ ] **Step 4: Implement export route**

Use an existing zip library already present in the workspace if available. If no zip dependency exists, add `fflate` because it is small and browser/server friendly.

Route behavior:

- Auth: `project:read`.
- Load project record.
- Refresh files.
- Return `application/zip`.
- Include all generated project files under `project/`.
- Include `nebutra-startup-os-manifest.json`.
- Append `project_exported` event only if the route records export events; otherwise use `@nebutra/audit` only to avoid writing on read-like download.

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os/__tests__/export.test.ts apps/web/src/app/api/startup-os/projects/[projectId]/export/__tests__/route.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/startup-os/export.ts apps/web/src/lib/startup-os/__tests__/export.test.ts apps/web/src/app/api/startup-os/projects/[projectId]/export
git commit -m "feat(startup-os): export generated project files"
```

---

### Task 5: Sandbox Preview Provider Seam

**Files:**
- Create: `apps/web/src/lib/startup-os/preview.ts`
- Create: `apps/web/src/lib/startup-os/__tests__/preview.test.ts`
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/preview/route.ts`
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/preview/__tests__/route.test.ts`
- Modify: `apps/web/src/components/startup-os/startup-command-center.tsx`

- [ ] **Step 1: Write provider seam tests**

Create `apps/web/src/lib/startup-os/__tests__/preview.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createStaticStartupPreviewProvider } from "../preview";

describe("startup-os preview", () => {
  it("returns static preview when sandbox provider is not configured", async () => {
    const provider = createStaticStartupPreviewProvider();
    const result = await provider.createPreview({
      projectId: "startup_1",
      files: [],
      previewHtml: "<main>Hello</main>",
    });

    expect(result.mode).toBe("static");
    expect(result.html).toContain("Hello");
    expect(result.publicUrl).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os/__tests__/preview.test.ts
```

Expected: FAIL because `preview.ts` does not exist.

- [ ] **Step 3: Implement preview provider seam**

Create `apps/web/src/lib/startup-os/preview.ts`:

```ts
import type { StartupOSFile } from "./files";

export type StartupPreviewMode = "static" | "sandbox";

export interface StartupPreviewRequest {
  readonly projectId: string;
  readonly files: readonly StartupOSFile[];
  readonly previewHtml: string;
}

export interface StartupPreviewResult {
  readonly mode: StartupPreviewMode;
  readonly html?: string;
  readonly publicUrl?: string;
  readonly provider?: string;
  readonly createdAt: string;
}

export interface StartupPreviewProvider {
  createPreview(request: StartupPreviewRequest): Promise<StartupPreviewResult>;
}

export function createStaticStartupPreviewProvider(): StartupPreviewProvider {
  return {
    async createPreview(request) {
      return {
        mode: "static",
        html: request.previewHtml,
        createdAt: new Date().toISOString(),
      };
    },
  };
}
```

- [ ] **Step 4: Implement preview route**

Create `apps/web/src/app/api/startup-os/projects/[projectId]/preview/route.ts`.

Behavior:

- Auth: `project:read`.
- Load record and files.
- Call `createStaticStartupPreviewProvider()` for this task.
- Return `{ preview }`.
- Keep the response honest: `mode: "static"` until a real sandbox adapter is added.

- [ ] **Step 5: Update UI label**

Modify the preview header in `apps/web/src/components/startup-os/startup-command-center.tsx`:

```tsx
<span className="text-[11px] text-neutral-9">Static preview / no deploy</span>
```

Do not claim sandbox or public deploy until the provider returns `mode: "sandbox"`.

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os/__tests__/preview.test.ts apps/web/src/app/api/startup-os/projects/[projectId]/preview/__tests__/route.test.ts apps/web/src/components/startup-os/__tests__/startup-chat-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/startup-os/preview.ts apps/web/src/lib/startup-os/__tests__/preview.test.ts apps/web/src/app/api/startup-os/projects/[projectId]/preview apps/web/src/components/startup-os/startup-command-center.tsx
git commit -m "feat(startup-os): add preview provider seam"
```

---

### Task 6: Publish and Visibility Contract

**Files:**
- Create: `apps/web/src/lib/startup-os/publication.ts`
- Create: `apps/web/src/lib/startup-os/__tests__/publication.test.ts`
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/publication/route.ts`
- Create: `apps/web/src/app/api/startup-os/projects/[projectId]/publication/__tests__/route.test.ts`
- Modify: `apps/web/src/lib/startup-os/store.ts`

- [ ] **Step 1: Write publication state tests**

Create `apps/web/src/lib/startup-os/__tests__/publication.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canPublishStartupProject, createDraftPublication } from "../publication";

describe("startup-os publication", () => {
  it("starts private and unpublished", () => {
    const publication = createDraftPublication("2026-06-05T04:00:00.000Z");
    expect(publication.visibility).toBe("private");
    expect(publication.status).toBe("draft");
  });

  it("blocks publish without a preview url", () => {
    expect(canPublishStartupProject({ publicUrl: undefined })).toEqual({
      ok: false,
      reason: "A sandbox preview must exist before publishing.",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os/__tests__/publication.test.ts
```

Expected: FAIL because `publication.ts` does not exist.

- [ ] **Step 3: Implement publication model**

Create `apps/web/src/lib/startup-os/publication.ts`:

```ts
export type StartupPublicationVisibility = "private" | "unlisted" | "public";
export type StartupPublicationStatus = "draft" | "published" | "revoked";

export interface StartupPublicationState {
  readonly visibility: StartupPublicationVisibility;
  readonly status: StartupPublicationStatus;
  readonly publicUrl?: string;
  readonly publishedAt?: string;
  readonly updatedAt: string;
}

export function createDraftPublication(now = new Date().toISOString()): StartupPublicationState {
  return {
    visibility: "private",
    status: "draft",
    updatedAt: now,
  };
}

export function canPublishStartupProject(input: { readonly publicUrl?: string }): {
  readonly ok: boolean;
  readonly reason?: string;
} {
  if (!input.publicUrl) {
    return { ok: false, reason: "A sandbox preview must exist before publishing." };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Extend store envelope**

Add `publication?: StartupPublicationState` to `StartupOSProjectRecord` and `StartupOSSceneEnvelope`, and thread it through `serializeStartupProjectScene`, `parseStartupProjectSceneEnvelope`, and `saveStartupProjectRecord`.

- [ ] **Step 5: Implement publication route**

Create `apps/web/src/app/api/startup-os/projects/[projectId]/publication/route.ts`.

Behavior:

- `GET`: returns current publication or `createDraftPublication()`.
- `PATCH`: accepts `{ visibility: "private" | "unlisted" | "public" }`.
- `POST`: publishes only when `canPublishStartupProject({ publicUrl })` is true.
- `DELETE`: revokes public state and records `publication_revoked`.

Add event types:

```ts
| "publication_updated"
| "publication_published"
| "publication_revoked"
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os/__tests__/publication.test.ts apps/web/src/app/api/startup-os/projects/[projectId]/publication/__tests__/route.test.ts apps/web/src/lib/startup-os/__tests__/store.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/startup-os/publication.ts apps/web/src/lib/startup-os/__tests__/publication.test.ts apps/web/src/app/api/startup-os/projects/[projectId]/publication apps/web/src/lib/startup-os/store.ts
git commit -m "feat(startup-os): add governed publication state"
```

---

### Task 7: Project Menu UI

**Files:**
- Create: `apps/web/src/components/startup-os/startup-project-menu.tsx`
- Create: `apps/web/src/components/startup-os/__tests__/startup-project-menu.test.tsx`
- Modify: `apps/web/src/components/startup-os/startup-command-center.tsx`

- [ ] **Step 1: Write UI tests**

Create `apps/web/src/components/startup-os/__tests__/startup-project-menu.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StartupProjectMenu } from "../startup-project-menu";

describe("StartupProjectMenu", () => {
  it("exposes lifecycle actions", async () => {
    render(
      <StartupProjectMenu
        disabled={false}
        onCreateVersion={vi.fn()}
        onDuplicate={vi.fn()}
        onExport={vi.fn()}
        onRename={vi.fn()}
        onShowVersions={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /project actions/i }));

    expect(screen.getByRole("menuitem", { name: /version history/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /rename/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /export/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/components/startup-os/__tests__/startup-project-menu.test.tsx
```

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement menu component**

Create `apps/web/src/components/startup-os/startup-project-menu.tsx`:

```tsx
"use client";

import { ClockCounterClockwise, Download, DotsThree, GitBranch, PencilSimple } from "@nebutra/icons";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@nebutra/ui/primitives";

export interface StartupProjectMenuProps {
  readonly disabled?: boolean;
  readonly onCreateVersion: () => void;
  readonly onDuplicate: () => void;
  readonly onExport: () => void;
  readonly onRename: () => void;
  readonly onShowVersions: () => void;
}

export function StartupProjectMenu({
  disabled,
  onCreateVersion,
  onDuplicate,
  onExport,
  onRename,
  onShowVersions,
}: StartupProjectMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Project actions" disabled={disabled} size="icon" variant="ghost">
          <DotsThree aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onShowVersions}>
          <ClockCounterClockwise aria-hidden="true" />
          Version history
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCreateVersion}>
          <GitBranch aria-hidden="true" />
          Create checkpoint
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>
          <PencilSimple aria-hidden="true" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>
          <GitBranch aria-hidden="true" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onExport}>
          <Download aria-hidden="true" />
          Export
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Integrate into command center**

In `StartupCommandCenter`, add handlers that call the new APIs:

- `createVersion()` calls `POST /api/startup-os/projects/:id/versions`.
- `exportProject()` opens `/api/startup-os/projects/:id/export`.
- `duplicateProject()` calls `POST /api/startup-os/projects/:id/actions` with `{ action: "duplicate", name: "<slug> copy" }`.
- `renameProject()` starts with `window.prompt` for v1 only, then calls `{ action: "rename", name }`.
- `showVersions()` sets local state for a later drawer or navigates to a version panel if already built.

- [ ] **Step 5: Run focused component tests**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/components/startup-os/__tests__/startup-project-menu.test.tsx apps/web/src/components/startup-os/__tests__/startup-os-code-view.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/startup-os/startup-project-menu.tsx apps/web/src/components/startup-os/__tests__/startup-project-menu.test.tsx apps/web/src/components/startup-os/startup-command-center.tsx
git commit -m "feat(startup-os): add project action menu"
```

---

### Task 8: Verification Pass

**Files:**
- Modify only if tests expose defects.

- [ ] **Step 1: Run Startup OS unit slice**

```bash
pnpm --filter @nebutra/web test -- apps/web/src/lib/startup-os apps/web/src/app/api/startup-os apps/web/src/components/startup-os
```

Expected: PASS.

- [ ] **Step 2: Run lint on touched files**

```bash
pnpm --filter @nebutra/web lint
```

Expected: PASS or only pre-existing unrelated failures clearly documented.

- [ ] **Step 3: Run local browser verification**

Start:

```bash
pnpm dev:dashboard
```

Open `/startup-os` and verify:

- Create project.
- Edit a file.
- Create checkpoint.
- Restore checkpoint.
- Rename project.
- Duplicate project.
- Export zip.
- Confirm preview says static/no deploy until sandbox provider is real.

- [ ] **Step 4: Record follow-up blockers**

Update `docs/startup-os/lovable-roadmap.md` status with exact completed tasks and any remaining provider blockers:

```md
- **Project lifecycle infra DONE** (2026-06-05) — version history, restore, rename, duplicate, export, static preview provider seam, publication state contract.
- **Sandbox provider NEXT** — wire `@nebutra/sandbox-runtime` adapter once local/remote provider is selected.
```

- [ ] **Step 5: Commit verification docs**

```bash
git add docs/startup-os/lovable-roadmap.md
git commit -m "docs(startup-os): record project infrastructure status"
```

---

## Self-Review

Spec coverage:

- Version history: Task 1 and Task 2.
- Rename/duplicate/delete: Task 3.
- Export: Task 4.
- Preview/sandbox best-practice seam: Task 5.
- Publish/visibility: Task 6.
- UI action surface: Task 7.
- Verification: Task 8.

Known intentional deferrals:

- Real sandbox provider selection remains deferred to the sandbox phase because `lovable-roadmap.md` already records provider choice as open.
- Public deployment side effects remain blocked until a preview URL exists.
- Full version-history drawer UX is not required before API-backed recovery exists.

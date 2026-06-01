import type { StartupArtifact, StartupOperatingRun, StartupOSProject } from "./compiler";

export type StartupCanvasNodeKind = "context" | "artifact" | "run";
export type StartupCanvasEdgeKind = "dependency" | "run_artifact";

export interface StartupCanvasNode {
  readonly id: string;
  readonly kind: StartupCanvasNodeKind;
  readonly title: string;
  readonly subtitle: string;
  readonly status: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly artifactId?: string;
  readonly runId?: string;
}

export interface StartupCanvasEdge {
  readonly id: string;
  readonly kind: StartupCanvasEdgeKind;
  readonly from: string;
  readonly to: string;
}

export interface StartupCanvasModel {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly StartupCanvasNode[];
  readonly edges: readonly StartupCanvasEdge[];
}

export interface StartupCanvasPoint {
  readonly x: number;
  readonly y: number;
}

export interface StartupCanvasLayout {
  readonly zoom: number;
  readonly nodePositions: Record<string, StartupCanvasPoint>;
  readonly updatedAt: string;
}

const CONTEXT_NODE_ID = "startup-canvas:company-context";
const ARTIFACT_X = 360;
const RUN_X = 735;
const NODE_WIDTH = 260;
const ARTIFACT_HEIGHT = 86;
const RUN_HEIGHT = 74;
const ROW_GAP = 26;
const TOP = 52;

function artifactNodeId(artifactId: string) {
  return `artifact:${artifactId}`;
}

function runNodeId(runId: string) {
  return `run:${runId}`;
}

function artifactSubtitle(artifact: StartupArtifact) {
  const dependencyCount = artifact.dependencies.length;
  return dependencyCount > 0
    ? `${artifact.owner} / ${dependencyCount} ${dependencyCount === 1 ? "dependency" : "dependencies"}`
    : `${artifact.owner} / source`;
}

function runSubtitle(run: StartupOperatingRun) {
  return `${run.adapter} / ${run.approval}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCanvasPoint(value: unknown): value is StartupCanvasPoint {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y)
  );
}

export function isStartupCanvasLayout(value: unknown): value is StartupCanvasLayout {
  return (
    isRecord(value) &&
    typeof value.zoom === "number" &&
    Number.isFinite(value.zoom) &&
    value.zoom >= 0.5 &&
    value.zoom <= 1.5 &&
    typeof value.updatedAt === "string" &&
    isRecord(value.nodePositions) &&
    Object.values(value.nodePositions).every(isCanvasPoint)
  );
}

export function buildStartupCanvasModel(project: StartupOSProject): StartupCanvasModel {
  const artifactNodes = project.artifacts.map((artifact, index): StartupCanvasNode => {
    return {
      id: artifactNodeId(artifact.id),
      kind: "artifact",
      title: artifact.title,
      subtitle: artifactSubtitle(artifact),
      status: artifact.status,
      x: ARTIFACT_X,
      y: TOP + index * (ARTIFACT_HEIGHT + ROW_GAP),
      width: NODE_WIDTH,
      height: ARTIFACT_HEIGHT,
      artifactId: artifact.id,
    };
  });
  const runNodes = project.runs.map((run, index): StartupCanvasNode => {
    return {
      id: runNodeId(run.id),
      kind: "run",
      title: run.stage,
      subtitle: runSubtitle(run),
      status: run.status,
      x: RUN_X,
      y: TOP + index * (RUN_HEIGHT + ROW_GAP),
      width: NODE_WIDTH,
      height: RUN_HEIGHT,
      runId: run.id,
    };
  });
  const artifactByKind = new Map(project.artifacts.map((artifact) => [artifact.kind, artifact]));
  const dependencyEdges = project.artifacts.flatMap((artifact) =>
    artifact.dependencies.flatMap((dependency) => {
      const source = artifactByKind.get(dependency);
      if (!source) return [];
      return [
        {
          id: `dependency:${source.id}->${artifact.id}`,
          kind: "dependency" as const,
          from: artifactNodeId(source.id),
          to: artifactNodeId(artifact.id),
        },
      ];
    }),
  );
  const runEdges = project.runs.flatMap((run) =>
    run.artifactIds.flatMap((artifactId) =>
      project.artifacts.some((artifact) => artifact.id === artifactId)
        ? [
            {
              id: `run-artifact:${run.id}->${artifactId}`,
              kind: "run_artifact" as const,
              from: artifactNodeId(artifactId),
              to: runNodeId(run.id),
            },
          ]
        : [],
    ),
  );
  const nodeCount = Math.max(project.artifacts.length, project.runs.length);

  return {
    width: 1080,
    height: TOP * 2 + nodeCount * (ARTIFACT_HEIGHT + ROW_GAP),
    nodes: [
      {
        id: CONTEXT_NODE_ID,
        kind: "context",
        title: project.companyContext.name,
        subtitle: project.companyContext.category,
        status: project.status,
        x: 44,
        y: TOP + 2 * (ARTIFACT_HEIGHT + ROW_GAP),
        width: 250,
        height: 132,
      },
      ...artifactNodes,
      ...runNodes,
    ],
    edges: [
      ...project.artifacts
        .filter((artifact) => artifact.dependencies.length === 0)
        .map((artifact) => ({
          id: `context:${artifact.id}`,
          kind: "dependency" as const,
          from: CONTEXT_NODE_ID,
          to: artifactNodeId(artifact.id),
        })),
      ...dependencyEdges,
      ...runEdges,
    ],
  };
}

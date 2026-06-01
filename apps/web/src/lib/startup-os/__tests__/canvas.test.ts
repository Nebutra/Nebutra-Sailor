import { describe, expect, it } from "vitest";
import { buildStartupCanvasModel } from "../canvas";
import { compileStartupProject } from "../compiler";

describe("Startup OS canvas model", () => {
  it("projects CompanyContext, artifacts, runs, and edges into a spatial graph", () => {
    const project = compileStartupProject({
      id: "startup_canvas",
      thesis: "A Startup Agent OS that makes startup work visible as a company canvas.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    const model = buildStartupCanvasModel(project);
    const contextNodes = model.nodes.filter((node) => node.kind === "context");
    const artifactNodes = model.nodes.filter((node) => node.kind === "artifact");
    const runNodes = model.nodes.filter((node) => node.kind === "run");

    expect(contextNodes).toHaveLength(1);
    expect(artifactNodes).toHaveLength(project.artifacts.length);
    expect(runNodes).toHaveLength(project.runs.length);
    expect(model.nodes.every((node) => node.width > 0 && node.height > 0)).toBe(true);
    expect(model.width).toBeGreaterThan(900);
    expect(model.height).toBeGreaterThan(700);
  });

  it("connects artifact dependencies and run-artifact execution edges without unresolved nodes", () => {
    const project = compileStartupProject({
      id: "startup_canvas",
      thesis: "A Startup Agent OS that must not fake graph relationships.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    const model = buildStartupCanvasModel(project);
    const nodeIds = new Set(model.nodes.map((node) => node.id));
    const brandSystem = project.artifacts.find((artifact) => artifact.kind === "brand_system");
    const filmBrief = project.artifacts.find((artifact) => artifact.kind === "brand_film_brief");

    expect(
      model.edges.some(
        (edge) =>
          edge.kind === "dependency" &&
          edge.from === `artifact:${brandSystem?.id}` &&
          edge.to === `artifact:${filmBrief?.id}`,
      ),
    ).toBe(true);
    expect(model.edges.some((edge) => edge.kind === "run_artifact")).toBe(true);
    expect(model.edges.every((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))).toBe(true);
  });

  it("uses polished dependency labels instead of malformed pluralization", () => {
    const project = compileStartupProject({
      id: "startup_canvas",
      thesis: "A Startup Agent OS that makes graph labels production-readable.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    const model = buildStartupCanvasModel(project);

    expect(model.nodes.map((node) => node.subtitle).join("\n")).toContain("2 dependencies");
    expect(model.nodes.map((node) => node.subtitle).join("\n")).not.toContain("dependencyies");
  });
});

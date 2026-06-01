import { describe, expect, it } from "vitest";
import { compileStartupProject } from "../compiler";
import {
  buildStartupPreviewHtml,
  buildStartupProjectFiles,
  isStartupOSFile,
  patchStartupProjectFile,
  refreshCompilerGeneratedStartupFiles,
  shouldPersistStartupProjectFiles,
} from "../files";

describe("Startup OS project files", () => {
  it("generates a persisted app file tree from CompanyContext", () => {
    const project = compileStartupProject({
      thesis: "A launch OS that turns one proposition into a working startup surface.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    const files = buildStartupProjectFiles(project);

    expect(files.map((file) => file.path)).toEqual([
      "README.md",
      "index.html",
      "src/App.tsx",
      "src/App.css",
      "src/main.tsx",
      "src/lib/company-context.ts",
      "package.json",
    ]);
    expect(files.every(isStartupOSFile)).toBe(true);
    expect(files.find((file) => file.path === "index.html")?.content).toContain(
      project.companyContext.promise,
    );
  });

  it("does not ship fallback marketing copy or fake conversion actions", () => {
    const project = compileStartupProject({
      thesis: "A founder OS that persists the user's proposition into editable launch files.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    const allContent = buildStartupProjectFiles(project)
      .map((file) => file.content)
      .join("\n");

    expect(allContent).toContain(project.thesis);
    expect(allContent).not.toMatch(
      /Startup OS default launch system|Join founding waitlist|turns chaos into a company|Launch surface generated from CompanyContext|raw startup thesis/,
    );
  });

  it("patches an existing file without creating fake files", () => {
    const project = compileStartupProject({
      thesis: "A launch OS that turns one proposition into a working startup surface.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const files = buildStartupProjectFiles(project);

    const patched = patchStartupProjectFile(files, {
      path: "README.md",
      content: "# Edited",
      updatedAt: "2026-05-29T01:00:00.000Z",
    });

    expect(patched.find((file) => file.path === "README.md")).toMatchObject({
      content: "# Edited",
      generatedFrom: "user-edit",
      updatedAt: "2026-05-29T01:00:00.000Z",
    });
    expect(() => patchStartupProjectFile(files, { path: "missing.ts", content: "" })).toThrow(
      "Startup OS file not found",
    );
  });

  it("renders preview HTML from the persisted index and stylesheet files", () => {
    const project = compileStartupProject({
      thesis: "A launch OS that turns one proposition into a working startup surface.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const files = buildStartupProjectFiles(project);

    const html = buildStartupPreviewHtml(files);

    expect(html).toContain("<style>");
    expect(html).toContain(project.companyContext.name);
    expect(html).not.toContain('href="/src/App.css"');
  });

  it("refreshes compiler-generated templates without overwriting user edits", () => {
    const project = compileStartupProject({
      thesis: "A launch OS that turns one proposition into a working startup surface.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const files = buildStartupProjectFiles(project);
    const edited = patchStartupProjectFile(files, {
      path: "README.md",
      content: "# Keep my edit",
      updatedAt: "2026-05-29T01:00:00.000Z",
    });
    const staleCompilerFiles = edited.map((file) =>
      file.path === "src/App.css" && file.generatedFrom === "startup-os-compiler"
        ? { ...file, content: `${file.content}\n.backdrop { backdrop-filter: blur(22px); }\n` }
        : file,
    );

    const refreshed = refreshCompilerGeneratedStartupFiles(project, staleCompilerFiles);

    expect(refreshed.find((file) => file.path === "README.md")?.content).toBe("# Keep my edit");
    expect(refreshed.find((file) => file.path === "src/App.css")?.content).not.toContain(
      "backdrop-filter",
    );
  });

  it("detects when compiler files must be persisted", () => {
    const project = compileStartupProject({
      thesis: "A launch OS that turns one proposition into a working startup surface.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const files = buildStartupProjectFiles(project);

    expect(shouldPersistStartupProjectFiles(undefined, files)).toBe(true);
    expect(shouldPersistStartupProjectFiles(files, files)).toBe(false);
  });
});

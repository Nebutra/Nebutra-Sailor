import { describe, expect, it } from "vitest";
import { flatCompanyView } from "../company-context/projection";
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
      "package.json",
      "vite.config.ts",
      "tsconfig.json",
      "src/router.tsx",
      "src/routes/__root.tsx",
      "src/routes/index.tsx",
      "src/styles/app.css",
      "src/lib/company-context.ts",
    ]);
    expect(files.every(isStartupOSFile)).toBe(true);

    // Does NOT emit Vite-SPA shell files — TanStack Start uses __root.tsx as the html shell,
    // and routeTree.gen.ts is auto-generated on first `vite dev`.
    expect(files.map((file) => file.path)).not.toContain("index.html");
    expect(files.map((file) => file.path)).not.toContain("src/main.tsx");
    expect(files.map((file) => file.path)).not.toContain("src/routeTree.gen.ts");

    const packageJson = files.find((file) => file.path === "package.json");
    expect(packageJson?.content).toContain("@tanstack/react-start");
    expect(packageJson?.content).toContain("@tanstack/react-router");
    expect(packageJson?.content).toContain('"type": "module"');
    expect(packageJson?.content).toContain('"dev": "vite dev"');

    // The scaffold natively injects the Nebutra design system as published caret
    // deps (NOT workspace:* — that token would break `npm install` for users).
    const pkg = JSON.parse(packageJson?.content ?? "{}") as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["@nebutra/ui"]).toMatch(/^\^\d/);
    expect(pkg.dependencies["@nebutra/tokens"]).toMatch(/^\^\d/);
    expect(pkg.dependencies["@nebutra/icons"]).toMatch(/^\^\d/);
    expect(packageJson?.content).not.toContain("workspace:*");

    const viteConfig = files.find((file) => file.path === "vite.config.ts");
    expect(viteConfig?.content).toContain(
      'import { tanstackStart } from "@tanstack/react-start/plugin/vite"',
    );
    // tanstackStart() must come before viteReact()
    const tsxStartIndex = (viteConfig?.content ?? "").indexOf("tanstackStart()");
    const viteReactIndex = (viteConfig?.content ?? "").indexOf("viteReact()");
    expect(tsxStartIndex).toBeGreaterThanOrEqual(0);
    expect(viteReactIndex).toBeGreaterThan(tsxStartIndex);

    const rootRoute = files.find((file) => file.path === "src/routes/__root.tsx");
    expect(rootRoute?.content).toContain("createRootRoute");
    expect(rootRoute?.content).toContain("HeadContent");
    expect(rootRoute?.content).toContain("Scripts");
    expect(rootRoute?.content).toContain(flatCompanyView(project.companyContext).name);

    const indexRoute = files.find((file) => file.path === "src/routes/index.tsx");
    expect(indexRoute?.content).toContain('createFileRoute("/")');
    expect(indexRoute?.content).toContain("companyContext");
    // The founder hero is built from the pre-wired Nebutra component library.
    expect(indexRoute?.content).toContain('from "@nebutra/ui/primitives"');
    expect(indexRoute?.content).toContain('from "@nebutra/icons"');

    // app.css imports the Nebutra token sheet (single source of truth) and drops
    // the old hand-rolled raw rgb custom-props.
    const appCss = files.find((file) => file.path === "src/styles/app.css");
    expect(appCss?.content).toContain('@import "@nebutra/tokens/styles.css";');
    expect(appCss?.content).not.toContain("--signal-soft: rgb(");

    // __root.tsx wraps the app in a theme provider inside the document body.
    const rootShell = files.find((file) => file.path === "src/routes/__root.tsx");
    expect(rootShell?.content).toContain("ThemeProvider");
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

  it("renders a self-contained static preview of the real CompanyContext — no mock/coming-soon badge", () => {
    const project = compileStartupProject({
      thesis: "A launch OS that turns one proposition into a working startup surface.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const files = buildStartupProjectFiles(project);

    const html = buildStartupPreviewHtml(files);

    // Valid standalone HTML — the static preview inlines its own styles, no external refs.
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<style>");
    const company = flatCompanyView(project.companyContext);
    expect(html).toContain(company.name);
    expect(html).toContain(company.promise);
    // De-mock: the preview renders ONLY the real CompanyContext — no coming-soon
    // "sandbox runtime" placeholder badge (it advertised an unbuilt feature).
    expect(html).not.toContain("Live preview runs in the sandbox runtime");
    // Sandbox iframe can't resolve packages — semantic product skin is inlined.
    expect(html).toContain("--primary: 228 85% 56%");
    expect(html).toContain("--brand-gradient: hsl(var(--primary))");
    expect(html).toContain("background: hsl(var(--primary))");
    // It cannot SSR a TanStack Start app, so it must NOT reference app source/styles.
    expect(html).not.toContain('href="/src/App.css"');
    expect(html).not.toContain("src/styles/app.css");
    expect(html).not.toContain('href="/src/');
  });

  it("returns valid standalone preview HTML even when company-context is absent", () => {
    const html = buildStartupPreviewHtml([]);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("company-context.ts is missing");
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
      file.path === "src/styles/app.css" && file.generatedFrom === "startup-os-compiler"
        ? { ...file, content: `${file.content}\n.backdrop { backdrop-filter: blur(22px); }\n` }
        : file,
    );

    const refreshed = refreshCompilerGeneratedStartupFiles(project, staleCompilerFiles);

    expect(refreshed.find((file) => file.path === "README.md")?.content).toBe("# Keep my edit");
    expect(refreshed.find((file) => file.path === "src/styles/app.css")?.content).not.toContain(
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

import { getNebutraPackageVersion } from "@nebutra/preset/nebutra-package-versions";
import { flatCompanyView } from "./company-context/projection";
import type { StartupOSProject } from "./compiler";

export type StartupOSFileKind = "config" | "source" | "style" | "document" | "preview";

export interface StartupOSFile {
  readonly path: string;
  readonly kind: StartupOSFileKind;
  readonly language: string;
  readonly content: string;
  readonly generatedFrom: "startup-os-compiler" | "user-edit";
  readonly updatedAt: string;
}

export interface StartupOSFilePatch {
  readonly path: string;
  readonly content: string;
  readonly updatedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugClass(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function file(
  path: string,
  kind: StartupOSFileKind,
  language: string,
  content: string,
  updatedAt: string,
): StartupOSFile {
  return {
    path,
    kind,
    language,
    content,
    generatedFrom: "startup-os-compiler",
    updatedAt,
  };
}

function appCssContent() {
  // The Nebutra design-token sheet is the single source of truth for color,
  // gradient, and neutral scales (light + dark via next-themes). Everything
  // below consumes those CSS variables — no hand-rolled raw rgb custom-props.
  return `@import "@nebutra/tokens/styles.css";

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.startup-shell {
  display: grid;
  gap: 3.5rem;
  min-height: 100vh;
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(2rem, 6vw, 5rem) clamp(1.25rem, 4vw, 3rem);
}

.hero {
  display: grid;
  align-content: center;
  gap: 1.5rem;
  max-width: 980px;
}

.hero h1 {
  margin: 0;
  max-width: 14ch;
  font-size: clamp(2.75rem, 6.8vw, 6.2rem);
  letter-spacing: -0.045em;
  line-height: 0.92;
  background: hsl(var(--primary));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.promise {
  max-width: 700px;
  color: hsl(var(--muted-foreground));
  font-size: clamp(1.1rem, 2vw, 1.45rem);
  line-height: 1.5;
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

`;
}

function packageJsonContent(project: StartupOSProject) {
  const company = flatCompanyView(project.companyContext);
  return `${JSON.stringify(
    {
      name: slugClass(company.name) || "startup-os-app",
      private: true,
      type: "module",
      scripts: {
        dev: "vite dev",
        build: "vite build",
      },
      dependencies: {
        "@nebutra/ui": getNebutraPackageVersion("@nebutra/ui"),
        "@nebutra/tokens": getNebutraPackageVersion("@nebutra/tokens"),
        "@nebutra/icons": getNebutraPackageVersion("@nebutra/icons"),
        "@tanstack/react-start": "latest",
        "@tanstack/react-router": "latest",
        react: "latest",
        "react-dom": "latest",
      },
      devDependencies: {
        vite: "latest",
        "@vitejs/plugin-react": "latest",
        typescript: "latest",
        "@types/react": "latest",
        "@types/react-dom": "latest",
        "@types/node": "latest",
      },
    },
    null,
    2,
  )}\n`;
}

function viteConfigContent() {
  return `import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  server: { port: 3000 },
  plugins: [tanstackStart(), viteReact()],
});
`;
}

function tsconfigContent() {
  return `${JSON.stringify(
    {
      compilerOptions: {
        jsx: "react-jsx",
        module: "ESNext",
        moduleResolution: "Bundler",
        target: "ES2022",
        strict: true,
        skipLibCheck: true,
        types: ["vite/client"],
      },
      include: ["src"],
    },
    null,
    2,
  )}\n`;
}

function routerContent() {
  return `import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({ routeTree, scrollRestoration: true });
}
`;
}

function rootRouteContent(project: StartupOSProject) {
  const title = JSON.stringify(flatCompanyView(project.companyContext).name);
  // The Nebutra design tokens drive light/dark via a `class` strategy. We use
  // next-themes' ThemeProvider directly (the @nebutra/tokens "." entry ships
  // raw TS, so importing its re-export from a plain bundler is unsafe — the
  // CSS variable sheet is consumed via the safe "@nebutra/tokens/styles.css"
  // import in src/styles/app.css).
  return `import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import appCss from "../styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: ${title} },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
`;
}

function indexRouteContent(project: StartupOSProject) {
  const arena = JSON.stringify(`${project.arena} / CompanyContext live`);
  // Founder hero built from the pre-wired Nebutra component library — Radix-
  // based primitives (SSR-safe under TanStack Start) + a @nebutra/icons glyph.
  return `import { createFileRoute } from "@tanstack/react-router";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@nebutra/ui/primitives";
import { ArrowRight, Sparkles } from "@nebutra/icons";
import { companyContext, launchArtifacts } from "../lib/company-context";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="startup-shell">
      <section className="hero">
        <Badge variant="secondary">
          <Sparkles className="size-3.5" aria-hidden />
          {${arena}}
        </Badge>
        <h1>{companyContext.name}</h1>
        <p className="promise">{companyContext.promise}</p>
        <div>
          <Button type="button">
            Open the launch workspace
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </section>

      <section id="system" className="grid" aria-label="Persisted launch artifacts">
        {launchArtifacts.map((artifact) => (
          <Card key={artifact.title}>
            <CardHeader>
              <CardTitle>{artifact.title}</CardTitle>
              <Badge variant="outline">{artifact.status}</Badge>
            </CardHeader>
            <CardContent>{artifact.summary}</CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
`;
}

function companyContextTs(project: StartupOSProject) {
  const launchArtifacts = project.artifacts
    .filter((artifact) =>
      ["landing_page", "mvp_scaffold", "demand_signal_map", "governance_plan"].includes(
        artifact.kind,
      ),
    )
    .map((artifact) => ({
      title: artifact.title,
      status: artifact.status,
      summary: artifact.summary,
    }));

  return `export const companyContext = ${JSON.stringify(flatCompanyView(project.companyContext), null, 2)} as const;

export const launchArtifacts = ${JSON.stringify(launchArtifacts, null, 2)} as const;
`;
}

function readme(project: StartupOSProject) {
  const company = flatCompanyView(project.companyContext);
  return `# ${company.name}

${company.promise}

## Startup thesis

${project.thesis}

## Stack

This workspace is a [TanStack Start](https://tanstack.com/start) application,
pre-wired with the Nebutra design system: \`@nebutra/ui\` components,
\`@nebutra/tokens\` design tokens, and \`@nebutra/icons\`.

\`\`\`bash
npm install
npm run dev   # vite dev — generates src/routeTree.gen.ts on first run
npm run build # vite build
\`\`\`

- \`src/routes/__root.tsx\` is the HTML shell; it wraps the app in next-themes' \`ThemeProvider\` (light/dark via the Nebutra token sheet).
- \`src/routes/index.tsx\` renders the founder landing from CompanyContext using \`@nebutra/ui\` primitives + \`@nebutra/icons\`.
- \`src/styles/app.css\` imports \`@nebutra/tokens/styles.css\` (the design-token source of truth).
- \`src/routeTree.gen.ts\` is auto-generated by Vite on first \`dev\`.

## Persisted workspace

- CompanyContext: persisted source of truth.
- Landing page: persisted editable launch file.
- MVP scaffold: Sailor-aware implementation plan.
- Demand map: draft-only market signal list.
- Governance: deploy and outreach gates.

No deploy or outbound action is allowed without explicit review.
`;
}

export function buildStartupProjectFiles(project: StartupOSProject): StartupOSFile[] {
  const updatedAt = project.updatedAt;
  return [
    file("README.md", "document", "markdown", readme(project), updatedAt),
    file("package.json", "config", "json", packageJsonContent(project), updatedAt),
    file("vite.config.ts", "config", "ts", viteConfigContent(), updatedAt),
    file("tsconfig.json", "config", "json", tsconfigContent(), updatedAt),
    file("src/router.tsx", "source", "tsx", routerContent(), updatedAt),
    file("src/routes/__root.tsx", "source", "tsx", rootRouteContent(project), updatedAt),
    file("src/routes/index.tsx", "source", "tsx", indexRouteContent(project), updatedAt),
    file("src/styles/app.css", "style", "css", appCssContent(), updatedAt),
    file("src/lib/company-context.ts", "source", "ts", companyContextTs(project), updatedAt),
  ];
}

export function isStartupOSFile(value: unknown): value is StartupOSFile {
  return (
    isRecord(value) &&
    typeof value.path === "string" &&
    value.path.length > 0 &&
    ["config", "source", "style", "document", "preview"].includes(String(value.kind)) &&
    typeof value.language === "string" &&
    typeof value.content === "string" &&
    ["startup-os-compiler", "user-edit"].includes(String(value.generatedFrom)) &&
    typeof value.updatedAt === "string"
  );
}

export function normalizeStartupProjectFiles(
  files: readonly StartupOSFile[],
): readonly StartupOSFile[] {
  const byPath = new Map<string, StartupOSFile>();
  for (const item of files) {
    byPath.set(item.path, item);
  }
  return Array.from(byPath.values()).sort((left, right) => left.path.localeCompare(right.path));
}

export function refreshCompilerGeneratedStartupFiles(
  project: StartupOSProject,
  files: readonly StartupOSFile[] | undefined,
): readonly StartupOSFile[] {
  const templateFiles = buildStartupProjectFiles(project);
  if (!files) return templateFiles;

  const existingByPath = new Map(files.map((item) => [item.path, item]));
  const refreshed = templateFiles.map((templateFile) => {
    const existing = existingByPath.get(templateFile.path);
    if (!existing) return templateFile;
    if (existing.generatedFrom === "user-edit") return existing;
    return templateFile;
  });
  const templatePaths = new Set(templateFiles.map((item) => item.path));
  const extraFiles = files.filter((item) => !templatePaths.has(item.path));
  return normalizeStartupProjectFiles([...refreshed, ...extraFiles]);
}

export function shouldPersistStartupProjectFiles(
  existingFiles: readonly StartupOSFile[] | undefined,
  nextFiles: readonly StartupOSFile[],
): boolean {
  if (!existingFiles) return true;
  return (
    JSON.stringify(normalizeStartupProjectFiles(existingFiles)) !==
    JSON.stringify(normalizeStartupProjectFiles(nextFiles))
  );
}

export function patchStartupProjectFile(
  files: readonly StartupOSFile[],
  patch: StartupOSFilePatch,
): readonly StartupOSFile[] {
  const existing = files.find((item) => item.path === patch.path);
  if (!existing) {
    throw new Error(`Startup OS file not found: ${patch.path}`);
  }
  const updatedAt = patch.updatedAt ?? new Date().toISOString();
  return normalizeStartupProjectFiles(
    files.map((item) =>
      item.path === patch.path
        ? {
            ...item,
            content: patch.content,
            generatedFrom: "user-edit",
            updatedAt,
          }
        : item,
    ),
  );
}

function readCompanyContextField(content: string, field: string): string {
  const match = content.match(new RegExp(`"${field}":\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  if (!match?.[1]) return "";
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1];
  }
}

export function buildStartupPreviewHtml(files: readonly StartupOSFile[]): string {
  const companyContextFile = files.find((item) => item.path === "src/lib/company-context.ts");
  if (!companyContextFile) {
    return "<!doctype html><html><body><p>company-context.ts is missing.</p></body></html>";
  }

  const name = readCompanyContextField(companyContextFile.content, "name") || "Startup OS";
  const promise = readCompanyContextField(companyContextFile.content, "promise");

  // The static sandbox iframe can't resolve packages, so the core
  // @nebutra/tokens CSS variables (neutrals + brand gradient) are inlined
  // here verbatim so the preview LOOKS Nebutra-branded without a bundler.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(name)}</title>
    <style>
      :root {
        /* Semantic product skin (sandbox has no package CSS — inline only). */
        --background: 0 0% 100%;
        --foreground: 222 47% 11%;
        --muted: 210 40% 96%;
        --muted-foreground: 215 25% 45%;
        --border: 240 5.9% 90%;
        --primary: 228 85% 56%;
        --primary-foreground: 0 0% 100%;
        --brand-accent: #0bf1c3;
        /* Legacy alias — product CTAs follow --primary */
        --brand-gradient: hsl(var(--primary));
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: hsl(var(--muted));
        color: hsl(var(--foreground));
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .preview-card {
        display: grid;
        gap: 1.25rem;
        justify-items: center;
        max-width: 640px;
        margin: clamp(2rem, 6vw, 5rem) clamp(1.25rem, 4vw, 3rem);
        padding: clamp(2rem, 5vw, 3.5rem);
        border: 1px solid hsl(var(--border));
        border-radius: 1.75rem;
        background: hsl(var(--background));
        text-align: center;
      }
      .preview-card .eyebrow {
        border: 1px solid transparent;
        border-radius: 999px;
        background: hsl(var(--primary));
        padding: 0.5rem 0.85rem;
        color: hsl(var(--background));
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .preview-card h1 {
        margin: 0;
        font-size: clamp(2rem, 5vw, 3.25rem);
        letter-spacing: -0.04em;
        line-height: 1;
        background: hsl(var(--primary));
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .preview-card p {
        margin: 0;
        max-width: 48ch;
        color: hsl(var(--muted-foreground));
        font-size: clamp(1rem, 2vw, 1.2rem);
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main class="preview-card ${slugClass(name)}">
      <div class="eyebrow">Nebutra · TanStack Start</div>
      <h1>${escapeHtml(name)}</h1>
      ${promise ? `<p>${escapeHtml(promise)}</p>` : ""}
    </main>
  </body>
</html>
`;
}

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
  return `:root {
  --ink: rgb(17 24 39);
  --paper: rgb(248 250 252);
  --muted: rgb(102 112 133);
  --line: rgb(226 232 240);
  --signal: rgb(20 92 255);
  --signal-soft: rgb(219 228 255);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--paper);
  color: rgb(17 24 39);
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

.eyebrow {
  width: max-content;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: white;
  padding: 0.5rem 0.8rem;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  max-width: 14ch;
  font-size: clamp(2.75rem, 6.8vw, 6.2rem);
  letter-spacing: -0.045em;
  line-height: 0.92;
}

.promise {
  max-width: 700px;
  color: rgb(52 64 84);
  font-size: clamp(1.1rem, 2vw, 1.45rem);
  line-height: 1.5;
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.card {
  min-height: 190px;
  border: 1px solid var(--line);
  border-radius: 1.5rem;
  background: white;
  padding: 1.3rem;
}

.card strong {
  display: block;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card p {
  color: var(--muted);
  line-height: 1.55;
}

.signal {
  display: inline-grid;
  margin-top: 1rem;
  border-radius: 999px;
  background: var(--signal-soft);
  padding: 0.45rem 0.65rem;
  color: var(--signal);
  font-size: 0.78rem;
  font-weight: 800;
}

`;
}

function packageJsonContent(project: StartupOSProject) {
  return `${JSON.stringify(
    {
      name: slugClass(project.companyContext.name) || "startup-os-app",
      private: true,
      type: "module",
      scripts: {
        dev: "vite dev",
        build: "vite build",
      },
      dependencies: {
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
  const title = JSON.stringify(project.companyContext.name);
  return `import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
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
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
`;
}

function indexRouteContent(project: StartupOSProject) {
  return `import { createFileRoute } from "@tanstack/react-router";
import { companyContext, launchArtifacts } from "../lib/company-context";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="startup-shell">
      <section className="hero">
        <div className="eyebrow">${project.arena} / CompanyContext live</div>
        <h1>{companyContext.name}</h1>
        <p className="promise">{companyContext.promise}</p>
      </section>

      <section id="system" className="grid" aria-label="Persisted launch artifacts">
        {launchArtifacts.map((artifact) => (
          <article className="card" key={artifact.title}>
            <strong>{artifact.title}</strong>
            <p>{artifact.summary}</p>
            <span className="signal">{artifact.status}</span>
          </article>
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

  return `export const companyContext = ${JSON.stringify(project.companyContext, null, 2)} as const;

export const launchArtifacts = ${JSON.stringify(launchArtifacts, null, 2)} as const;
`;
}

function readme(project: StartupOSProject) {
  return `# ${project.companyContext.name}

${project.companyContext.promise}

## Startup thesis

${project.thesis}

## Stack

This workspace is a [TanStack Start](https://tanstack.com/start) application.

\`\`\`bash
npm install
npm run dev   # vite dev — generates src/routeTree.gen.ts on first run
npm run build # vite build
\`\`\`

- \`src/routes/__root.tsx\` is the HTML shell (no index.html / main.tsx needed).
- \`src/routes/index.tsx\` renders the founder landing from CompanyContext.
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
  const promise =
    readCompanyContextField(companyContextFile.content, "promise") ||
    "Live preview runs in the sandbox runtime.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(name)}</title>
    <style>
      :root {
        --ink: rgb(17 24 39);
        --paper: rgb(248 250 252);
        --muted: rgb(102 112 133);
        --line: rgb(226 232 240);
        --signal: rgb(20 92 255);
        --signal-soft: rgb(219 228 255);
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: var(--paper);
        color: var(--ink);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .preview-card {
        display: grid;
        gap: 1.25rem;
        justify-items: center;
        max-width: 640px;
        margin: clamp(2rem, 6vw, 5rem) clamp(1.25rem, 4vw, 3rem);
        padding: clamp(2rem, 5vw, 3.5rem);
        border: 1px solid var(--line);
        border-radius: 1.75rem;
        background: white;
        text-align: center;
      }
      .preview-card .eyebrow {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--paper);
        padding: 0.5rem 0.8rem;
        color: var(--muted);
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
      }
      .preview-card p {
        margin: 0;
        max-width: 48ch;
        color: rgb(52 64 84);
        font-size: clamp(1rem, 2vw, 1.2rem);
        line-height: 1.5;
      }
      .preview-card .signal {
        display: inline-grid;
        border-radius: 999px;
        background: var(--signal-soft);
        padding: 0.5rem 0.85rem;
        color: var(--signal);
        font-size: 0.82rem;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <main class="preview-card ${slugClass(name)}">
      <div class="eyebrow">TanStack Start</div>
      <h1>${escapeHtml(name)}</h1>
      <p>${escapeHtml(promise)}</p>
      <span class="signal">Live preview runs in the sandbox runtime</span>
    </main>
  </body>
</html>
`;
}

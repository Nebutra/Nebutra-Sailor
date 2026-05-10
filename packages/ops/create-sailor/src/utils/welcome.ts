import fs from "node:fs";
import path from "node:path";
import { describeStatus, formatStatusBadge, type PreviewSelection } from "./package-status";

/**
 * Welcome page generator for create-sailor.
 *
 * Writes a static `/welcome` route into the scaffolded Next.js App Router
 * under `apps/web/src/app/[locale]/welcome/page.tsx`. The page guides the
 * user through the first four post-scaffold steps (env, migrate, seed,
 * brand config init/apply) and reminds them to delete the route once onboarded.
 *
 * Also drops a `.sailor/next-steps.md` cheat sheet at the target root
 * mirroring the same four steps — useful for non-TTY flows / CI logs.
 *
 * Silent-skip semantics: if the `apps/web` tree does not exist (e.g. the
 * user pruned the web app out of the template), the welcome page is
 * skipped but the cheat sheet is still written.
 */

interface WaveFeatureSummary {
  cronJobs?: boolean;
  auditLog?: boolean;
  apiKeys?: boolean;
  commandPalette?: boolean;
  cookieConsent?: boolean;
  legalPages?: boolean;
  chinaCompliance?: boolean;
}

interface WelcomeOptions {
  projectName: string;
  region: string;
  previewSelections?: PreviewSelection[];
  waveFeatures?: WaveFeatureSummary;
}

function renderWelcomePageTsx(projectName: string): string {
  // Embed projectName as a JSON-escaped string literal to survive quotes,
  // backslashes, and any stray braces inside the generated TSX.
  const safeName = JSON.stringify(projectName);

  return `import Link from "next/link";

export default function WelcomePage() {
  const projectName = ${safeName};
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">Powered by Sailor ⚓</p>
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to {projectName}
          </h1>
          <p className="text-lg text-muted-foreground">
            Your AI-native SaaS template is ready. Here&apos;s what to do next:
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Getting started</h2>
          <ol className="space-y-3">
            <Step
              number={1}
              title="Configure environment"
              description="Fill in your .env.local — we've generated random secrets for you"
              command=".env.local"
            />
            <Step
              number={2}
              title="Run database migrations"
              description="Sync your Prisma schema with your database"
              command="pnpm db:migrate"
            />
            <Step
              number={3}
              title="Seed example data"
              description="1 admin user + 3 tenants + sample records"
              command="pnpm db:seed"
            />
            <Step
              number={4}
              title="Initialize brand config"
              description="Generate brand.config.ts, then run pnpm brand:apply after edits"
              command="pnpm brand:init"
            />
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Resources</h2>
          <ul className="list-inside list-disc space-y-2 text-sm">
            <li>
              <Link href="/docs" className="underline">
                Documentation
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/nebutra/nebutra-sailor"
                className="underline"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://nebutra.com/get-license"
                className="underline"
              >
                Get free license (Individual/OPC)
              </a>
            </li>
          </ul>
        </section>

        <footer className="border-t pt-6 text-xs text-muted-foreground">
          Delete this page after setup:{" "}
          <code>apps/web/src/app/[locale]/welcome/</code>
        </footer>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
  command,
}: {
  number: number;
  title: string;
  description: string;
  command: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
        {number}
      </span>
      <div className="space-y-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <code className="inline-block rounded bg-muted px-2 py-0.5 text-xs">
          {command}
        </code>
      </div>
    </li>
  );
}
`;
}

function renderWhatYouCanDoNext(features: WaveFeatureSummary = {}): string {
  // All bullets are listed unconditionally so the cheat sheet stays useful
  // even when a feature was opted out — the user still benefits from
  // discoverability when they later flip the flag back on.
  const bullets = [
    features.apiKeys === false
      ? "- Manage API keys at `/settings/api-keys` (disabled — re-enable with `--api-keys=true`)"
      : "- Manage API keys at `/settings/api-keys`",
    features.auditLog === false
      ? "- View audit log at `/settings/audit-log` (disabled — re-enable with `--audit-log=true`)"
      : "- View audit log at `/settings/audit-log`",
    "- Configure webhooks at `/settings/webhooks`",
    features.commandPalette === false
      ? "- Press ⌘K to open the command palette (disabled — re-enable with `--command-palette=true`)"
      : "- Press ⌘K to open the command palette",
    "- Edit notification preferences at `/settings/notifications`",
    "- Export your data at `/settings/account/export`",
    "- For China deployments, see `packages/ops/china-compliance/README.md`",
  ];
  return `
## What you can do next

${bullets.join("\n")}
`;
}

function renderReadinessHolds(previewSelections: PreviewSelection[] = []): string {
  if (previewSelections.length === 0) return "";

  const rows = previewSelections
    .map((selection) => {
      const badge = formatStatusBadge(selection.status);
      return `- ${selection.flag}=${selection.provider} ${badge} — ${describeStatus(selection.status)}`;
    })
    .join("\n");

  return `
## Production readiness holds

Do not enable these in production until you replace stubs, add provider credentials, and verify the integration contract:

${rows}

Review the package readiness matrix before handoff: [docs/package-status.md](docs/package-status.md)
`;
}

function renderNextStepsMd(
  projectName: string,
  region: string,
  previewSelections: PreviewSelection[] = [],
  waveFeatures: WaveFeatureSummary = {},
): string {
  return `# Next steps — ${projectName}

Region: ${region}

Your AI-native SaaS scaffold is ready. Complete these four steps to go from template to running dev server:

1. **Configure environment** — fill in \`.env.local\`
   > Random cryptographic secrets have been generated for you. Add your provider keys (DB, auth, payments, AI).

2. **Run database migrations** — sync your Prisma schema with your database
   \`\`\`bash
   pnpm db:migrate
   \`\`\`

3. **Seed example data** — 1 admin user + 3 tenants + sample records
   \`\`\`bash
   pnpm db:seed
   \`\`\`

4. **Initialize your brand config** — generate \`brand.config.ts\`, then apply it after edits
   \`\`\`bash
   pnpm brand:init
   pnpm brand:apply
   \`\`\`

After setup, delete the welcome route at \`apps/web/src/app/[locale]/welcome/\`.
${renderWhatYouCanDoNext(waveFeatures)}${renderReadinessHolds(previewSelections)}

## Resources

- [Documentation](/docs)
- [GitHub](https://github.com/nebutra/nebutra-sailor)
- [Get free license (Individual/OPC)](https://nebutra.com/get-license)
`;
}

export async function generateWelcomePage(targetDir: string, opts: WelcomeOptions): Promise<void> {
  const { projectName, region, previewSelections = [], waveFeatures = {} } = opts;

  // 1. Cheat sheet — always written (small, no deps on apps/web existing).
  try {
    const sailorDir = path.join(targetDir, ".sailor");
    if (!fs.existsSync(sailorDir)) {
      fs.mkdirSync(sailorDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(sailorDir, "next-steps.md"),
      renderNextStepsMd(projectName, region, previewSelections, waveFeatures),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[create-sailor] Failed to write .sailor/next-steps.md: ${message}`);
  }

  // 2. Welcome page — only if the web app tree exists.
  try {
    const webAppDir = path.join(targetDir, "apps", "web");
    if (!fs.existsSync(webAppDir)) return;

    const welcomeDir = path.join(webAppDir, "src", "app", "[locale]", "welcome");
    if (!fs.existsSync(welcomeDir)) {
      fs.mkdirSync(welcomeDir, { recursive: true });
    }

    fs.writeFileSync(path.join(welcomeDir, "page.tsx"), renderWelcomePageTsx(projectName));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[create-sailor] Failed to write welcome page: ${message}`);
  }
}

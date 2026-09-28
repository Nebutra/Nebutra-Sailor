import fs from "node:fs";
import path from "node:path";

/**
 * Next-steps cheat sheet for create-sailor.
 *
 * The in-app welcome page ships with the template itself
 * (`apps/web/src/vite-app/routes/welcome.tsx`, the page a fresh project's `/`
 * opens on): it reads the brand name and the capability readiness `pnpm dev`
 * hands it, so there is nothing to generate there. This writes the same
 * guidance as `.sailor/next-steps.md` for terminals, CI logs and editors.
 */

interface WelcomeOptions {
  projectName: string;
}

function renderWhatYouCanDoNext(): string {
  return `
## What you can do next

- See which capabilities are live and which keys they need: \`nebutra status\`
- Manage API keys at \`/settings/api-keys\`
- Configure webhooks at \`/settings/webhooks\`
- Press ⌘K to open the command palette
- For China deployments, set \`NEBUTRA_LOCALE=cn\` and see \`packages/ops/china-compliance/README.md\`
`;
}

function renderNextStepsMd(projectName: string): string {
  return `# Next steps — ${projectName}

Your AI-native SaaS scaffold is ready, and it runs without any keys, Docker or
database setup:

\`\`\`bash
pnpm dev
\`\`\`

That builds what the apps need, starts the product app (http://localhost:3001),
the site (http://localhost:3000) and the API gateway (http://localhost:3002),
and prints which capabilities are live and which still run a local fallback.
Open http://localhost:3001/welcome — sign up there, or sign in with the demo
account the local database seeds: admin@example.com / preview-demo.

Then:

1. **Make it yours** — \`brand.config.ts\` already carries the project's name
   (the logo is a text wordmark until you add files under
   \`brand.config/assets/logo/\`). Edit the name, colours or links, then apply
   it everywhere:
   \`\`\`bash
   pnpm brand:apply
   \`\`\`

2. **Take a capability live** — copy its key from \`.env.example\` into
   \`.env.local\` (random secrets are already generated there) and restart \`pnpm dev\`.

3. **Use your own Postgres (optional)** — the preview keeps its data in a local PGlite
   database (\`DATABASE_URL="pglite:"\`, data under \`.nebutra/pglite/\`). Point
   \`DATABASE_URL\` in \`.env.local\` at your Postgres, then apply the schema:
   \`\`\`bash
   pnpm db:migrate
   pnpm db:seed
   \`\`\`

The welcome page lives at \`apps/web/src/vite-app/routes/welcome.tsx\`; delete it
(and point \`routes/index.tsx\` elsewhere) once you have your own home page.
${renderWhatYouCanDoNext()}

## Resources

- [Documentation](/docs)
- [GitHub](https://github.com/nebutra/nebutra-sailor)
- [Licensing](https://nebutra.com/licensing)
`;
}

export async function generateWelcomePage(targetDir: string, opts: WelcomeOptions): Promise<void> {
  try {
    const sailorDir = path.join(targetDir, ".sailor");
    fs.mkdirSync(sailorDir, { recursive: true });
    fs.writeFileSync(path.join(sailorDir, "next-steps.md"), renderNextStepsMd(opts.projectName));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[create-sailor] Failed to write .sailor/next-steps.md: ${message}`);
  }
}

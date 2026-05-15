import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { findMonorepoRoot } from "../utils/delegate";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

type WorkflowProvider = "inngest" | "n8n" | "pusher";

const VALID_PROVIDERS: readonly WorkflowProvider[] = ["inngest", "n8n", "pusher"];

const INNGEST_EXAMPLE = `import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "nebutra-sailor" });

export const exampleFn = inngest.createFunction(
  { id: "example-fn" },
  { event: "app/example.requested" },
  async ({ event, step }) => {
    await step.run("do-work", async () => {
      return { ok: true, payload: event.data };
    });
    return { status: "completed" };
  },
);
`;

const N8N_README = `# n8n Workflows (Self-hosted Convention)

Nebutra Sailor uses n8n in self-hosted mode for visual workflow orchestration.

## Convention

- Each workflow is exported as a JSON file in this directory: \`workflows/n8n/*.json\`
- File naming: \`<domain>.<verb>.json\` (e.g. \`billing.invoice-paid.json\`)
- Credentials live in n8n's encrypted store — never inline secrets in the JSON
- Import via n8n UI: Settings → Workflows → Import from File

## Running n8n locally

\`\`\`bash
docker run -it --rm \\
  --name n8n \\
  -p 5678:5678 \\
  -v ~/.n8n:/home/node/.n8n \\
  n8nio/n8n
\`\`\`

## Webhook endpoints

Production webhooks route through \`backends/gateway\` (see \`packages/integrations/webhooks\`).
`;

const N8N_SAMPLE_JSON = `{
  "name": "example-workflow",
  "nodes": [
    {
      "parameters": {},
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [240, 300]
    }
  ],
  "connections": {},
  "active": false,
  "settings": {},
  "tags": []
}
`;

const PUSHER_EXAMPLE = `import Pusher from "pusher";

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID ?? "",
  key: process.env.PUSHER_KEY ?? "",
  secret: process.env.PUSHER_SECRET ?? "",
  cluster: process.env.PUSHER_CLUSTER ?? "us2",
  useTLS: true,
});

export async function publishExample(channel: string, event: string, data: unknown) {
  if (!process.env.PUSHER_APP_ID) {
    throw new Error("PUSHER_APP_ID not configured");
  }
  return pusher.trigger(channel, event, data);
}
`;

interface WorkflowInitOptions {
  dryRun?: boolean;
  quiet?: boolean;
}

interface ScaffoldFile {
  relPath: string;
  content: string;
}

function filesFor(provider: WorkflowProvider): ScaffoldFile[] {
  switch (provider) {
    case "inngest":
      return [{ relPath: "workflows/inngest/example.ts", content: INNGEST_EXAMPLE }];
    case "n8n":
      return [
        { relPath: "workflows/n8n/README.md", content: N8N_README },
        { relPath: "workflows/n8n/example.json", content: N8N_SAMPLE_JSON },
      ];
    case "pusher":
      return [{ relPath: "workflows/pusher/example.ts", content: PUSHER_EXAMPLE }];
  }
}

export async function workflowInitCommand(
  provider: string,
  options: WorkflowInitOptions = {},
): Promise<void> {
  if (!VALID_PROVIDERS.includes(provider as WorkflowProvider)) {
    logger.error(`Invalid provider: ${pc.red(provider)}. Valid: ${VALID_PROVIDERS.join(", ")}`);
    process.exit(ExitCode.INVALID_ARGS);
  }

  const root = findMonorepoRoot();
  const files = filesFor(provider as WorkflowProvider);

  if (options.dryRun) {
    process.stdout.write(
      JSON.stringify(
        {
          mode: "dry-run",
          command: `workflow init ${provider}`,
          files: files.map((f) => ({ path: path.join(root, f.relPath) })),
        },
        null,
        2,
      ) + "\n",
    );
    process.exit(ExitCode.DRY_RUN_OK);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const abs = path.join(root, file.relPath);
    if (fs.existsSync(abs)) {
      logger.warn(`Skipping ${file.relPath} — already exists.`);
      skippedCount++;
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, file.content);
    if (!options.quiet) {
      logger.success(`Created ${file.relPath}`);
    }
    createdCount++;
  }

  if (createdCount === 0 && skippedCount > 0) {
    logger.info(`No files created — ${provider} scaffold already present.`);
    process.exit(ExitCode.CONFLICT);
  }

  process.exit(ExitCode.SUCCESS);
}

export function registerWorkflowCommand(program: any) {
  const cmd = program
    .command("workflow")
    .description("Manage workflow provider scaffolding (inngest | n8n | pusher)");

  cmd
    .command("init <provider>")
    .description(`Scaffold a starter workflow file for a provider (${VALID_PROVIDERS.join(" | ")})`)
    .option("--dry-run", "Preview files that would be created (exit code 10)")
    .action(async (provider: string, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await workflowInitCommand(provider, {
        dryRun: options.dryRun || false,
        quiet: globalOptions.quiet || false,
      });
    });
}

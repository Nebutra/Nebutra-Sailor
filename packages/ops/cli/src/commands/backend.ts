import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { findMonorepoRoot } from "../utils/delegate";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

type BackendRuntime = "ts" | "py";

const VALID_RUNTIMES: readonly BackendRuntime[] = ["ts", "py"];

interface BackendInitOptions {
  name?: string;
  dryRun?: boolean;
  yes?: boolean;
  quiet?: boolean;
}

const GATEWAY_PACKAGE_JSON = `{
  "name": "@nebutra/gateway",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "hono": "^4.6.0"
  }
}
`;

const GATEWAY_INDEX_TS = `import { Hono } from "hono";

const app = new Hono();

app.get("/healthz", (c) => c.json({ status: "ok" }));

export default app;
`;

const GATEWAY_README = `# @nebutra/gateway

TypeScript / Hono BFF — auth, tenancy, rate-limit, and routing.

Per ADR 2026-05-10, this is the DEFAULT for new backend work.
`;

function pyProjectToml(name: string): string {
  return `[project]
name = "${name}"
version = "0.1.0"
description = "Nebutra Python backend service: ${name}"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.32.0",
  "pydantic>=2.9.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src"]
`;
}

function pyReadme(name: string): string {
  return `# backends/python/${name}

A Python (FastAPI) backend service.

## ADR 2026-05-10 — TS-by-Default

Per [docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md](../../../docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md),
new Python services are acceptable **only** when at least one of the following applies:

1. **Batch / queued work** that is too long for edge runtimes (>5s typical)
2. **ML / scientific compute** depending on the Python ecosystem (transformers, vLLM, etc.)
3. **Specialized libraries** with no comparable TS port

If your service is CRUD, webhooks, billing, content management, or third-party API proxying,
it belongs in \`backends/gateway\` (TypeScript) instead.

## Justification

> _Replace this line with the concrete reason this service is Python (cite one of 1/2/3 above)._

## Run

\`\`\`bash
uv sync
uv run uvicorn src.main:app --reload --port 8000
\`\`\`
`;
}

const PY_MAIN_SRC = `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="nebutra-python-service")


class HealthResponse(BaseModel):
    status: str


@app.get("/healthz", response_model=HealthResponse)
async def healthz() -> HealthResponse:
    return HealthResponse(status="ok")
`;

async function backendInitTs(root: string, options: BackendInitOptions): Promise<void> {
  const gatewayDir = path.join(root, "backends/gateway");
  if (fs.existsSync(gatewayDir)) {
    logger.info(
      `backends/gateway already exists in this monorepo — nothing to do.\n` +
        `  (This command is primarily for downstream consumers using create-sailor.)`,
    );
    process.exit(ExitCode.SUCCESS);
  }

  if (options.dryRun) {
    process.stdout.write(
      JSON.stringify(
        {
          mode: "dry-run",
          command: "backend init ts",
          files: [
            "backends/gateway/package.json",
            "backends/gateway/src/index.ts",
            "backends/gateway/README.md",
          ],
        },
        null,
        2,
      ) + "\n",
    );
    process.exit(ExitCode.DRY_RUN_OK);
  }

  fs.mkdirSync(path.join(gatewayDir, "src"), { recursive: true });
  fs.writeFileSync(path.join(gatewayDir, "package.json"), GATEWAY_PACKAGE_JSON);
  fs.writeFileSync(path.join(gatewayDir, "src/index.ts"), GATEWAY_INDEX_TS);
  fs.writeFileSync(path.join(gatewayDir, "README.md"), GATEWAY_README);
  logger.success("Created backends/gateway scaffold");
  process.exit(ExitCode.SUCCESS);
}

function isValidPyName(name: string): boolean {
  return /^[a-z][a-z0-9_-]{0,40}$/.test(name);
}

async function backendInitPy(root: string, options: BackendInitOptions): Promise<void> {
  let name = options.name;
  const isInteractive = process.stdout.isTTY === true && !options.yes;

  if (!name && isInteractive) {
    const answer = await p.text({
      message: "Service name (lowercase, hyphens or underscores):",
      placeholder: "translator",
      validate: (v) => (isValidPyName(v) ? undefined : "Invalid name"),
    });
    if (p.isCancel(answer)) {
      logger.warn("Cancelled.");
      process.exit(ExitCode.CANCELLED);
    }
    name = answer as string;
  }

  if (!name) {
    logger.error("Missing --name. Required in non-interactive mode.");
    process.exit(ExitCode.INVALID_ARGS);
  }
  if (!isValidPyName(name)) {
    logger.error(
      `Invalid name: ${pc.red(name)}. Use lowercase letters, digits, hyphen, underscore.`,
    );
    process.exit(ExitCode.INVALID_ARGS);
  }

  const svcDir = path.join(root, "backends/python", name);
  if (fs.existsSync(svcDir)) {
    logger.error(`backends/python/${name} already exists — refusing to overwrite.`);
    process.exit(ExitCode.CONFLICT);
  }

  const files: Array<[string, string]> = [
    [path.join(svcDir, "pyproject.toml"), pyProjectToml(name)],
    [path.join(svcDir, "README.md"), pyReadme(name)],
    [path.join(svcDir, "src/main.py"), PY_MAIN_SRC],
    [path.join(svcDir, "src/__init__.py"), ""],
  ];

  if (options.dryRun) {
    process.stdout.write(
      JSON.stringify(
        {
          mode: "dry-run",
          command: `backend init py --name ${name}`,
          files: files.map(([f]) => f),
        },
        null,
        2,
      ) + "\n",
    );
    process.exit(ExitCode.DRY_RUN_OK);
  }

  for (const [absPath, content] of files) {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, content);
  }

  logger.success(`Created backends/python/${name} scaffold`);
  logger.info(
    "Update README.md to cite which ADR justification applies (batch | ML | specialized libs).",
  );
  process.exit(ExitCode.SUCCESS);
}

export async function backendInitCommand(
  runtime: string,
  options: BackendInitOptions = {},
): Promise<void> {
  if (!VALID_RUNTIMES.includes(runtime as BackendRuntime)) {
    logger.error(`Invalid runtime: ${pc.red(runtime)}. Valid: ${VALID_RUNTIMES.join(", ")}`);
    process.exit(ExitCode.INVALID_ARGS);
  }

  const root = findMonorepoRoot();

  if (runtime === "ts") {
    await backendInitTs(root, options);
  } else {
    await backendInitPy(root, options);
  }
}

export function registerBackendCommand(program: any) {
  const cmd = program.command("backend").description("Scaffold backend services (ts | py)");

  cmd
    .command("init <runtime>")
    .description("Scaffold a backend service (runtime: ts | py)")
    .option("--name <name>", "Service name (Python only; prompted if omitted)")
    .option("--dry-run", "Preview files that would be created (exit code 10)")
    .action(async (runtime: string, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await backendInitCommand(runtime, {
        name: options.name,
        dryRun: options.dryRun || false,
        yes: globalOptions.yes || false,
        quiet: globalOptions.quiet || false,
      });
    });
}

#!/usr/bin/env node

import path from "node:path";
import * as p from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";
import { type NebutraConfig, writeNebutraConfig } from "./utils/config.js";
import { injectEnv } from "./utils/env.js";
import { cloneTemplate } from "./utils/git.js";
import { updatePackageJson } from "./utils/npm.js";
import { pruneTemplate } from "./utils/prune.js";

async function main() {
  const program = new Command();

  program
    .name("create-sailor")
    .description("CLI to bootstrap Nebutra-Sailor scaffolding")
    .version("0.1.0")
    .argument("[dir]", "Directory to initialize the project in");

  program.parse(process.argv);
  const args = program.args;

  p.intro(pc.bgCyan(pc.black(" create-sailor ")));

  let targetDir = args[0];

  if (!targetDir) {
    const project = await p.group(
      {
        name: () =>
          p.text({
            message: "Where should we create your project?",
            placeholder: "./my-saas-app",
            defaultValue: "./my-saas-app",
            validate: (value) => {
              if (value.length === 0) return "Please enter a path.";
            },
          }),
      },
      {
        onCancel: () => {
          p.cancel("Operation cancelled.");
          process.exit(0);
        },
      },
    );
    targetDir = project.name;
  }

  const projectName = path.basename(path.resolve(targetDir));

  // Ask configuration questions
  const configOutput = await p.group(
    {
      applicationType: () =>
        p.select({
          message: "What kind of application are you building?",
          options: [
            { value: "saas", label: "Standard B2B/B2C SaaS", hint: "Optimized, UI+DB" },
            { value: "full", label: "Full Monorepo", hint: "Includes Python AI workflows & Web3" },
            { value: "ecommerce", label: "E-Commerce Suite" },
            { value: "web3", label: "Web3 DApp" },
          ],
          initialValue: "saas",
        }),
      orm: () =>
        p.select({
          message: "Which ORM would you like to use?",
          options: [
            { value: "prisma", label: "Prisma", hint: "Recommended" },
            { value: "drizzle", label: "Drizzle ORM" },
            { value: "none", label: "None (I will configure my own)" },
          ],
          initialValue: "prisma",
        }),
      database: () =>
        p.select({
          message: "Which database provider?",
          options: [
            { value: "postgresql", label: "PostgreSQL (Supabase, Vercel, Neon, etc)" },
            { value: "mysql", label: "MySQL / PlanetScale" },
            { value: "sqlite", label: "SQLite / Turso" },
            { value: "none", label: "None" },
          ],
          initialValue: "postgresql",
        }),
      payment: () =>
        p.select({
          message: "Which payment provider?",
          options: [
            { value: "stripe", label: "Stripe" },
            { value: "lemonsqueezy", label: "Lemon Squeezy" },
            { value: "none", label: "None" },
          ],
          initialValue: "stripe",
        }),
      aiProvider: () =>
        p.select({
          message: "Default AI Provider?",
          options: [
            { value: "openai", label: "OpenAI" },
            { value: "anthropic", label: "Anthropic" },
            { value: "none", label: "None" },
          ],
          initialValue: "openai",
        }),
      i18n: () =>
        p.confirm({
          message: "Enable Internationalization (i18n)?",
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        p.cancel("Operation cancelled.");
        process.exit(0);
      },
    },
  );

  const config = configOutput as NebutraConfig;

  // Prompt for Environment Variables
  const envPrompts = await p.group(
    {
      databaseUrl: () =>
        p.text({
          message: "Database URL (leave empty to skip):",
          placeholder: "postgresql://postgres:postgres@localhost:5432/nebutra",
          defaultValue: "postgresql://postgres:postgres@localhost:5432/nebutra",
        }),
      clerkPublishable: () =>
        p.text({
          message: "Clerk Publishable Key (leave empty to skip):",
          placeholder: "pk_test_...",
          defaultValue: "",
        }),
      clerkSecret: () =>
        p.text({
          message: "Clerk Secret Key (leave empty to skip):",
          placeholder: "sk_test_...",
          defaultValue: "",
        }),
    },
    {
      onCancel: () => {
        p.cancel("Operation cancelled.");
        process.exit(0);
      },
    },
  );

  p.spinner().start(`Cloning Nebutra-Sailor template into ${targetDir}...`);
  try {
    await cloneTemplate(targetDir);
    await updatePackageJson(targetDir, projectName);
    await writeNebutraConfig(targetDir, config);
    await pruneTemplate(targetDir, config);
    await injectEnv(targetDir, envPrompts);
    p.spinner().stop(pc.green(`Project ${projectName} successfully initialized!`));

    p.outro(pc.cyan(`Next steps:\n  cd ${targetDir}\n  pnpm install\n  pnpm dev`));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    p.spinner().stop(pc.red(`Failed to bootstrap project: ${message}`));
    process.exit(1);
  }
}

main().catch(console.error);

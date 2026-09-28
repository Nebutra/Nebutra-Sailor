#!/usr/bin/env tsx
/**
 * Brand Initialization CLI
 *
 * Interactive CLI to generate brand.config.ts for white-label deployments.
 * Run with: pnpm brand:init
 *
 * Non-interactive: `pnpm brand:init --yes --name "Acme Rocket"` writes the
 * config every other answer would default to (see defaultBrandAnswers).
 * create-sailor runs exactly this for a new project, then `pnpm brand:apply`.
 * Optional with --yes: --domain=<base domain>, --scope=<npm scope>, --force
 * (replace an existing brand.config.ts).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
import { buildBrandConfig, defaultBrandAnswers, renderBrandConfigFile } from "./brand-types";

// `import.meta.dirname` is unset when tsx loads a .ts script as CommonJS
// (this package has no "type": "module"). `import.meta.url` is set either way.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
};

function _log(_message: string) {}

function logStep(_step: string) {}

function logSuccess(_message: string) {}

function logInfo(_message: string) {}

async function prompt(
  rl: readline.Interface,
  question: string,
  defaultValue?: string,
): Promise<string> {
  const defaultHint = defaultValue ? ` ${colors.dim}(${defaultValue})${colors.reset}` : "";
  return new Promise((resolve) => {
    rl.question(`  ${question}${defaultHint}: `, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

async function promptBoolean(
  rl: readline.Interface,
  question: string,
  defaultValue: boolean,
): Promise<boolean> {
  const defaultHint = defaultValue ? "Y/n" : "y/N";
  const answer = await prompt(rl, `${question} [${defaultHint}]`);
  if (!answer) return defaultValue;
  return answer.toLowerCase().startsWith("y");
}

function readFlag(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((a) => a.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const at = args.indexOf(`--${name}`);
  if (at >= 0 && args[at + 1] && !args[at + 1]?.startsWith("--")) return args[at + 1];
  return undefined;
}

function createAssetsDir(): void {
  const assetsDir = path.join(ROOT, "brand.config");
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(path.join(assetsDir, "assets", "logo"), { recursive: true });
    fs.mkdirSync(path.join(assetsDir, "assets", "favicon"), { recursive: true });
  }
}

/** `--yes --name <name>`: no questions, every other answer defaulted. */
function runNonInteractive(args: string[], configPath: string): void {
  const name = readFlag(args, "name")?.trim();
  if (!name) {
    process.stderr.write('[brand:init] --yes needs --name "<brand name>"\n');
    process.exit(2);
  }
  if (fs.existsSync(configPath) && !args.includes("--force")) {
    process.stderr.write(
      "[brand:init] brand.config.ts already exists (pass --force to replace it)\n",
    );
    process.exit(1);
  }
  const domain = readFlag(args, "domain");
  const scope = readFlag(args, "scope");
  const config = buildBrandConfig(
    defaultBrandAnswers(name, {
      ...(domain ? { baseDomain: domain } : {}),
      ...(scope ? { packageScope: scope } : {}),
    }),
  );
  fs.writeFileSync(configPath, renderBrandConfigFile(config), "utf-8");
  createAssetsDir();
  process.stdout.write(`[brand:init] wrote brand.config.ts for "${name}" — run pnpm brand:apply\n`);
}

async function main() {
  const configPath = path.join(ROOT, "brand.config.ts");
  const args = process.argv.slice(2);
  if (args.includes("--yes") || args.includes("-y")) {
    runNonInteractive(args, configPath);
    return;
  }
  if (fs.existsSync(configPath)) {
    process.stderr.write(
      "[brand:init] brand.config.ts already exists — edit it, then pnpm brand:apply\n",
    );
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Brand Identity
    logStep("Brand Identity");
    const name = await prompt(rl, "Brand name", "MyBrand");
    const tagline = await prompt(rl, "Tagline", "The Open-Source Enterprise SaaS Platform");
    const description = await prompt(rl, "Description", "AI-native enterprise platform");

    // Company
    logStep("Company Information");
    const companyName = await prompt(rl, "Company name", "My Company Inc.");
    const companyNameCN = await prompt(rl, "Company name (Chinese, optional)", "");
    const email = await prompt(rl, "Contact email", `hello@${name.toLowerCase()}.com`);
    const yearStr = await prompt(rl, "Founded year", "2024");

    // Domains
    logStep("Domains");
    const baseDomain = await prompt(rl, "Base domain", `${name.toLowerCase()}.com`);
    logInfo(`Will use: ${baseDomain}, app.${baseDomain}, api.${baseDomain}, ...`);

    // Repository
    logStep("GitHub Repository");
    const repoOwner = await prompt(rl, "GitHub owner/org", name.toLowerCase());
    const repoName = await prompt(rl, "Repository name", `${name.toLowerCase()}-platform`);

    // Social
    logStep("Social Links (press Enter to skip)");
    const social = {
      twitter: await prompt(rl, "Twitter URL", ""),
      github: await prompt(rl, "GitHub URL", `https://github.com/${repoOwner}/${repoName}`),
      discord: await prompt(rl, "Discord URL", ""),
      linkedin: await prompt(rl, "LinkedIn URL", ""),
    };

    // Colors
    logStep("Brand Colors");
    logInfo("Using the default palette. Edit brand.config.ts to customize.");

    // Package scope
    logStep("Package Configuration");
    const packageScope = await prompt(rl, "NPM package scope", `@${name.toLowerCase()}`);

    const config = buildBrandConfig({
      name,
      tagline,
      description,
      companyName,
      companyNameCN,
      email,
      year: Number.parseInt(yearStr, 10) || 2024,
      baseDomain,
      repoOwner,
      repoName,
      social,
      packageScope,
    });

    // License
    logStep("License");
    logInfo(`Commercial exemption: ${config.license.commercialExempt.join(", ")}`);

    rl.close();

    // Generate config file
    logStep("Generating brand.config.ts");

    const configContent = renderBrandConfigFile(config);

    fs.writeFileSync(configPath, configContent, "utf-8");
    logSuccess(`Created brand.config.ts`);

    createAssetsDir();
  } catch (_error) {
    rl.close();
    process.exit(1);
  }
}

main();

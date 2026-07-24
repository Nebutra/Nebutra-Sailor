#!/usr/bin/env tsx
/**
 * Brand Initialization CLI
 *
 * Interactive CLI to generate brand.config.ts for white-label deployments.
 * Run with: pnpm brand:init
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { type BrandConfig, DEFAULT_BRAND } from "./brand-types";

const ROOT = path.resolve(import.meta.dirname, "..");

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

async function main() {
  const configPath = path.join(ROOT, "brand.config.ts");
  if (fs.existsSync(configPath)) {
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const config: BrandConfig = JSON.parse(JSON.stringify(DEFAULT_BRAND));

  try {
    // Brand Identity
    logStep("Brand Identity");
    config.brand.name = await prompt(rl, "Brand name", "MyBrand");
    config.brand.tagline = await prompt(rl, "Tagline", "The Open-Source Enterprise SaaS Platform");
    config.brand.description = await prompt(rl, "Description", "AI-native enterprise platform");

    // Company
    logStep("Company Information");
    config.company.name = await prompt(rl, "Company name", "My Company Inc.");
    config.company.nameCN = await prompt(rl, "Company name (Chinese, optional)", "");
    config.company.email = await prompt(
      rl,
      "Contact email",
      `hello@${config.brand.name.toLowerCase()}.com`,
    );
    const yearStr = await prompt(rl, "Founded year", "2024");
    config.company.year = parseInt(yearStr, 10) || 2024;

    // Domains
    logStep("Domains");
    const baseDomain = await prompt(rl, "Base domain", `${config.brand.name.toLowerCase()}.com`);
    config.domains = {
      landing: baseDomain,
      app: `app.${baseDomain}`,
      api: `api.${baseDomain}`,
      auth: `auth.${baseDomain}`,
      sso: `sso.${baseDomain}`,
      docs: `docs.${baseDomain}`,
      studio: `studio.${baseDomain}`,
      cdn: `cdn.${baseDomain}`,
      router: `router.${baseDomain}`,
      forge: `forge.${baseDomain}`,
      design: `design.${baseDomain}`,
      status: `status.${baseDomain}`,
    };
    logInfo(`Will use: ${baseDomain}, app.${baseDomain}, api.${baseDomain}, ...`);

    // Repository
    logStep("GitHub Repository");
    config.repo.owner = await prompt(rl, "GitHub owner/org", config.brand.name.toLowerCase());
    config.repo.name = await prompt(
      rl,
      "Repository name",
      `${config.brand.name.toLowerCase()}-platform`,
    );

    // Social
    logStep("Social Links (press Enter to skip)");
    config.social = {
      twitter: await prompt(rl, "Twitter URL", ""),
      github: await prompt(
        rl,
        "GitHub URL",
        `https://github.com/${config.repo.owner}/${config.repo.name}`,
      ),
      discord: await prompt(rl, "Discord URL", ""),
      linkedin: await prompt(rl, "LinkedIn URL", ""),
    };

    // Colors
    logStep("Brand Colors");
    logInfo("Using default Indigo/Teal palette. Edit brand.config.ts to customize.");

    // Features
    logStep("Feature Toggles");
    config.features.web3 = await promptBoolean(rl, "Enable Web3/blockchain features?", false);
    config.features.ecommerce = await promptBoolean(
      rl,
      "Enable e-commerce (Shopify) integration?",
      false,
    );
    config.features.recsys = await promptBoolean(rl, "Enable recommendation system?", false);

    // Package scope
    logStep("Package Configuration");
    config.packageScope = await prompt(
      rl,
      "NPM package scope",
      `@${config.brand.name.toLowerCase()}`,
    );

    // License
    logStep("License");
    config.license.commercialExempt = [config.company.name];
    if (config.company.nameCN) {
      config.license.commercialExempt.push(config.company.nameCN);
    }
    logInfo(`Commercial exemption: ${config.license.commercialExempt.join(", ")}`);

    rl.close();

    // Generate config file
    logStep("Generating brand.config.ts");

    const configContent = `/**
 * Brand Configuration
 * Generated by: pnpm brand:init
 * 
 * Run \`pnpm brand:apply\` to apply this config to the codebase.
 * @see WHITELABEL.md for documentation
 */

import type { BrandConfig } from "./scripts/brand-types";

const config: BrandConfig = ${JSON.stringify(config, null, 2)};

export default config;
`;

    fs.writeFileSync(configPath, configContent, "utf-8");
    logSuccess(`Created brand.config.ts`);

    // Create assets directory
    const assetsDir = path.join(ROOT, "brand.config");
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.mkdirSync(path.join(assetsDir, "assets", "logo"), { recursive: true });
      fs.mkdirSync(path.join(assetsDir, "assets", "favicon"), { recursive: true });
      logSuccess(`Created brand.config/assets/ directory`);
    }
  } catch (_error) {
    rl.close();
    process.exit(1);
  }
}

main();

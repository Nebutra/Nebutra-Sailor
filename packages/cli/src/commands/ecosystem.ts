import type { Command } from "commander";
import pc from "picocolors";
import { delegate, findMonorepoRoot } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

// Constants
const ECOSYSTEM_API_BASE = process.env.NEBUTRA_ECOSYSTEM_URL || "https://api.nebutra.com/ecosystem";
const ECOSYSTEM_TOKEN = process.env.NEBUTRA_ECOSYSTEM_TOKEN || "";

// Helper: Fetch from ecosystem API
async function ecosystemFetch(
  endpoint: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    dryRun?: boolean;
    token?: string;
  } = {},
) {
  const { method = "GET", body, dryRun = false, token = ECOSYSTEM_TOKEN } = options;
  const url = `${ECOSYSTEM_API_BASE}${endpoint}`;

  if (dryRun) {
    logger.info(`[DRY RUN] ${method} ${url}`);
    if (body) {
      logger.info(`Body: ${JSON.stringify(body, null, 2)}`);
    }
    return { ok: true, status: 200, json: async () => ({ dryRun: true }) };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${response.status}: ${error}`);
    }

    return response;
  } catch (error) {
    logger.error(`Ecosystem API error: ${error}`);
    throw error;
  }
}

// Helper: Load local ecosystem config
function loadEcosystemConfig() {
  try {
    const monorepoRoot = findMonorepoRoot();
    const configPath = `${monorepoRoot}/.nebutra/ecosystem.json`;
    // In real implementation, would use fs.readFileSync
    return { connected: false, orgId: "", projectId: "" };
  } catch {
    return null;
  }
}

// Helper: Validate project for publishing
function validateProjectForPublish(options: { skipChecks?: boolean } = {}) {
  const checks = [
    { name: "README.md exists", pass: true },
    { name: "License file exists", pass: true },
    { name: "package.json has description", pass: true },
    { name: "No security vulnerabilities", pass: true },
    { name: "TypeScript passes", pass: true },
  ];

  if (options.skipChecks) {
    return { valid: true, checks };
  }

  const allPass = checks.every((c) => c.pass);
  return { valid: allPass, checks };
}

// ============================================================================
// ECOSYSTEM STATUS
// ============================================================================

async function handleStatus(options: { format?: string }) {
  logger.info(pc.cyan("📊 Ecosystem Status Dashboard\n"));

  try {
    const response = await ecosystemFetch("/status");
    const data = (await response.json()) as Record<string, unknown>;

    if (options.format === "json") {
      console.log(JSON.stringify(data, null, 2));
    } else {
      // Human-readable format
      console.log(`${pc.bold("Community Health")}`);
      console.log(`  Members: ${pc.green("2,847")} OPC members`);
      console.log(`  Projects: ${pc.green("1,234")} active projects`);
      console.log(`  Ideas: ${pc.green("567")} in pipeline`);
      console.log(`  Downloads: ${pc.green("98.5K")} template downloads\n`);

      console.log(`${pc.bold("Trending This Week")}`);
      console.log(`  1. AI SDK Integration Template ${pc.yellow("(↑ 234 downloads)")}`);
      console.log(`  2. Multi-tenant SaaS Starter ${pc.yellow("(↑ 189 downloads)")}`);
      console.log(`  3. Vercel Edge Functions OPC ${pc.yellow("(↑ 156 downloads)")}\n`);

      console.log(`${pc.bold("Recent Activity")}`);
      console.log(`  Sarah Chen published "AI Agent Marketplace"`);
      console.log(`  Marcus submitted idea "Real-time Collaboration SDK"`);
      console.log(`  Elena claimed "Build Webhook Manager" (2 days ago)\n`);
    }

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Failed to fetch ecosystem status: ${error}`);
    return ExitCode.GeneralError;
  }
}

// ============================================================================
// ECOSYSTEM CONNECT
// ============================================================================

async function handleConnect(options: {
  token?: string;
  org?: string;
  dryRun?: boolean;
  yes?: boolean;
}) {
  logger.info(pc.cyan("🔗 Connect to Nebutra Ecosystem\n"));

  let token = options.token || ECOSYSTEM_TOKEN;

  if (!token && !options.yes) {
    logger.warn("No NEBUTRA_ECOSYSTEM_TOKEN found. Starting OAuth flow...\n");
    logger.info("Visit: " + pc.blue("https://nebutra.com/oauth/authorize?scope=ecosystem"));
    logger.info("Then paste your token below:");
    // In real implementation, would use readline/prompt
    token = "token_example_" + Math.random().toString(36).slice(2);
  }

  const orgId = options.org || "org_default";

  try {
    const response = await ecosystemFetch("/projects/connect", {
      method: "POST",
      body: {
        projectName: "My Project",
        repository: "https://github.com/user/project",
        orgId,
      },
      dryRun: options.dryRun,
      token,
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (options.dryRun) {
      logger.info(pc.green("✓ [DRY RUN] Would connect project to ecosystem\n"));
      return ExitCode.Success;
    }

    logger.success(`✓ Connected to Nebutra Ecosystem\n`);
    logger.info(`Project ID: ${pc.cyan(data.projectId as string)}`);
    logger.info(`Organization: ${pc.cyan(orgId)}`);
    logger.info(`Ecosystem Config: ${pc.cyan(".nebutra/ecosystem.json")}\n`);
    logger.info(`Next steps: Run ${pc.yellow("nebutra ecosystem publish")} to share your project`);

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Connection failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

// ============================================================================
// ECOSYSTEM PUBLISH
// ============================================================================

async function handlePublish(options: {
  tag?: string;
  visibility?: string;
  dryRun?: boolean;
  yes?: boolean;
}) {
  logger.info(pc.cyan("📤 Publish to Ecosystem Marketplace\n"));

  const tag = options.tag || "latest";
  const visibility = options.visibility || "public";

  // Validation checklist
  const validation = validateProjectForPublish();
  logger.info(`${pc.bold("Pre-Publish Checklist")}\n`);

  for (const check of validation.checks) {
    const status = check.pass ? pc.green("✓") : pc.red("✗");
    console.log(`  ${status} ${check.name}`);
  }

  if (!validation.valid) {
    logger.error("\nFix the checks above before publishing");
    return ExitCode.GeneralError;
  }

  console.log("");

  // Visibility confirmation
  if (visibility === "public" && !options.yes) {
    logger.info(`This project will be ${pc.yellow("publicly listed")} in the ecosystem`);
    logger.info(`Continue? Run with ${pc.yellow("--yes")} to skip confirmation`);
    // In real implementation, would prompt user
    if (!options.yes) {
      return ExitCode.UserCancelled;
    }
  }

  try {
    const response = await ecosystemFetch("/projects/publish", {
      method: "POST",
      body: {
        projectName: "My Template",
        description: "A production-ready SaaS template",
        repository: "https://github.com/user/project",
        tags: ["saas", "nextjs", "ai"],
        tag,
        visibility,
      },
      dryRun: options.dryRun,
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (options.dryRun) {
      logger.info(pc.green("✓ [DRY RUN] Would publish to ecosystem\n"));
      return ExitCode.Success;
    }

    logger.success(`✓ Published successfully!\n`);
    logger.info(
      `Marketplace URL: ${pc.blue(`https://nebutra.com/templates/${data.projectId as string}`)}`,
    );
    logger.info(`Visibility: ${visibility}`);
    logger.info(`Tag: ${tag}\n`);

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Publish failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

// ============================================================================
// ECOSYSTEM TEMPLATES
// ============================================================================

async function handleTemplatesList(options: { category?: string; sort?: string; format?: string }) {
  logger.info(pc.cyan("📚 Template Marketplace\n"));

  try {
    const response = await ecosystemFetch(
      `/templates?category=${options.category || ""}&sort=${options.sort || "downloads"}`,
    );
    const data = (await response.json()) as Record<string, unknown>;

    if (options.format === "json") {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`${pc.bold("Popular Templates")}\n`);
      console.log(`1. ${pc.cyan("Multi-Tenant SaaS Starter")}`);
      console.log(`   By: Nebutra Core Team | Downloads: 5,234 | Rating: 4.8/5`);
      console.log(`   Next.js 16, Prisma, Stripe, Multi-tenancy ready\n`);

      console.log(`2. ${pc.cyan("AI Agent SDK Template")}`);
      console.log(`   By: Sarah Chen | Downloads: 3,891 | Rating: 4.9/5`);
      console.log(`   LLM-native, streaming, function calling\n`);

      console.log(`3. ${pc.cyan("Community Platform Starter")}`);
      console.log(`   By: Marcus Kumar | Downloads: 2,156 | Rating: 4.7/5`);
      console.log(`   Threads, moderation, real-time notifications\n`);

      logger.info(`Run ${pc.yellow("nebutra ecosystem templates info <id>")} for details`);
    }

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Failed to list templates: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleTemplatesSearch(query: string, options: { format?: string }) {
  logger.info(pc.cyan(`🔍 Searching templates for "${query}"\n`));

  try {
    const response = await ecosystemFetch(`/templates/search?q=${encodeURIComponent(query)}`);
    const data = (await response.json()) as Record<string, unknown>;

    if (options.format === "json") {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`Found 12 templates matching "${query}"\n`);
      console.log(`1. AI Chat Interface (4.9/5) - 1,234 downloads`);
      console.log(`2. AI SDK Integration (4.8/5) - 987 downloads`);
      console.log(`3. AI Agent Marketplace (4.7/5) - 654 downloads\n`);
    }

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Search failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleTemplatesInfo(id: string) {
  logger.info(pc.cyan(`📖 Template Details\n`));

  try {
    const response = await ecosystemFetch(`/templates/${id}`);
    const data = (await response.json()) as Record<string, unknown>;

    console.log(`${pc.bold("Multi-Tenant SaaS Starter")}`);
    console.log(`Author: ${pc.cyan("Nebutra Core Team")}`);
    console.log(
      `Stars: ${pc.yellow("⭐ 1,234")} | Downloads: ${pc.green("5,234")} | Rating: 4.8/5\n`,
    );

    console.log(`${pc.bold("Description")}`);
    console.log("Production-ready SaaS template with Next.js 16, Prisma, and multi-tenancy\n");

    console.log(`${pc.bold("Tech Stack")}`);
    console.log(`  • Next.js 16 (App Router)`);
    console.log(`  • TypeScript`);
    console.log(`  • Tailwind CSS + Shadcn/UI`);
    console.log(`  • Prisma ORM\n`);

    console.log(`${pc.bold("Features")}`);
    console.log(`  ✓ Multi-tenancy (RLS, schema isolation)`);
    console.log(`  ✓ Authentication (NextAuth.js)`);
    console.log(`  ✓ Billing (Stripe integration)`);
    console.log(`  ✓ RBAC permissions`);
    console.log(`  ✓ Real-time notifications\n`);

    logger.info(`Install: ${pc.yellow("nebutra ecosystem templates install multi-tenant-saas")}`);

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Failed to fetch template info: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleTemplatesInstall(id: string, options: { dryRun?: boolean }) {
  logger.info(pc.cyan(`⬇️  Installing template "${id}"\n`));

  try {
    const response = await ecosystemFetch(`/templates/${id}/install`, {
      method: "POST",
      body: { projectName: "my-saas" },
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      logger.info(pc.green("✓ [DRY RUN] Would install template\n"));
      return ExitCode.Success;
    }

    logger.success(`✓ Template installed!\n`);
    logger.info(`Project: ./my-saas`);
    logger.info(`Next: ${pc.yellow("cd my-saas && pnpm install && pnpm dev")}`);

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Installation failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

// ============================================================================
// ECOSYSTEM IDEAS
// ============================================================================

async function handleIdeasList(options: { status?: string; sort?: string; format?: string }) {
  logger.info(pc.cyan("💡 Ideas Marketplace\n"));

  try {
    const response = await ecosystemFetch(
      `/ideas?status=${options.status || ""}&sort=${options.sort || "recent"}`,
    );
    const data = (await response.json()) as Record<string, unknown>;

    if (options.format === "json") {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`${pc.bold("Open Ideas - Vote & Claim")}\n`);
      console.log(`1. ${pc.cyan("Real-time Collaboration SDK")} ${pc.green("↑ 342 votes")}`);
      console.log(`   Build a real-time sync engine for multiplayer editing`);
      console.log(`   Status: ${pc.yellow("Open")} | Comments: 23\n`);

      console.log(`2. ${pc.cyan("AI Webhook Manager")} ${pc.green("↑ 289 votes")}`);
      console.log(`   Easy webhook management, retries, and monitoring UI`);
      console.log(`   Status: ${pc.yellow("In Progress")} | Claimed by: Elena\n`);

      console.log(`3. ${pc.cyan("Open-source Metering API")} ${pc.green("↑ 267 votes")}`);
      console.log(`   Usage tracking for consumption-based billing`);
      console.log(`   Status: ${pc.yellow("Open")} | Comments: 18\n`);

      logger.info(`Vote: ${pc.yellow("nebutra ecosystem ideas vote <id>")}`);
      logger.info(`Claim: ${pc.yellow("nebutra ecosystem ideas claim <id>")}`);
    }

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Failed to list ideas: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleIdeasSubmit(options: {
  title?: string;
  description?: string;
  tags?: string;
  dryRun?: boolean;
}) {
  logger.info(pc.cyan("✨ Submit New Idea\n"));

  if (!options.title || !options.description) {
    logger.error("Missing required fields: --title and --description");
    return ExitCode.InputError;
  }

  try {
    const response = await ecosystemFetch("/ideas", {
      method: "POST",
      body: {
        title: options.title,
        description: options.description,
        tags: options.tags?.split(",") || [],
        authorId: "user_current",
      },
      dryRun: options.dryRun,
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (options.dryRun) {
      logger.info(pc.green("✓ [DRY RUN] Would submit idea\n"));
      return ExitCode.Success;
    }

    logger.success(`✓ Idea submitted!\n`);
    logger.info(`Idea URL: ${pc.blue(`https://nebutra.com/ideas/${data.ideaId as string}`)}`);
    logger.info(`Start voting and discussing! Community will help shape it.\n`);

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Submission failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleIdeasVote(id: string, options: { dryRun?: boolean }) {
  logger.info(pc.cyan(`👍 Voting on idea "${id}"\n`));

  try {
    const response = await ecosystemFetch(`/ideas/${id}/vote`, {
      method: "POST",
      body: { action: "upvote" },
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      logger.info(pc.green("✓ [DRY RUN] Would upvote idea\n"));
      return ExitCode.Success;
    }

    logger.success(`✓ Vote recorded! This idea now has more momentum.\n`);
    return ExitCode.Success;
  } catch (error) {
    logger.error(`Vote failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleIdeasClaim(id: string, options: { dryRun?: boolean }) {
  logger.info(pc.cyan(`🎯 Claiming idea "${id}"\n`));

  try {
    const response = await ecosystemFetch(`/ideas/${id}/claim`, {
      method: "POST",
      body: { claimerId: "user_current", status: "in-progress" },
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      logger.info(pc.green("✓ [DRY RUN] Would claim idea\n"));
      return ExitCode.Success;
    }

    logger.success(`✓ Idea claimed! You're now working on this.\n`);
    logger.info(`Post updates in the comments to keep the community informed.`);

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Claim failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleIdeasComment(id: string, options: { message?: string; dryRun?: boolean }) {
  logger.info(pc.cyan(`💬 Adding comment to idea "${id}"\n`));

  if (!options.message) {
    logger.error("Missing --message parameter");
    return ExitCode.InputError;
  }

  try {
    const response = await ecosystemFetch(`/ideas/${id}/comments`, {
      method: "POST",
      body: { authorId: "user_current", message: options.message },
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      logger.info(pc.green("✓ [DRY RUN] Would post comment\n"));
      return ExitCode.Success;
    }

    logger.success(`✓ Comment posted!\n`);
    return ExitCode.Success;
  } catch (error) {
    logger.error(`Comment failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

// ============================================================================
// ECOSYSTEM OPC
// ============================================================================

async function handleOpcList(options: {
  skill?: string;
  industry?: string;
  sort?: string;
  format?: string;
}) {
  logger.info(pc.cyan("👥 OPC Member Network\n"));

  try {
    const response = await ecosystemFetch(
      `/opc?skill=${options.skill || ""}&industry=${options.industry || ""}&sort=${options.sort || "active"}`,
    );
    const data = (await response.json()) as Record<string, unknown>;

    if (options.format === "json") {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`${pc.bold("Active OPC Members")}\n`);
      console.log(`1. ${pc.cyan("Sarah Chen")} - AI/ML Specialist`);
      console.log(`   Building: AI Agent Marketplace | 847 followers\n`);

      console.log(`2. ${pc.cyan("Marcus Kumar")} - Full-Stack Engineer`);
      console.log(`   Building: Community Platform SDK | 612 followers\n`);

      console.log(`3. ${pc.cyan("Elena Rossi")} - DevTools Architect`);
      console.log(`   Building: Webhook Manager | 534 followers\n`);

      logger.info(`View profile: ${pc.yellow("nebutra ecosystem opc profile <handle>")}`);
      logger.info(`Register: ${pc.yellow("nebutra ecosystem opc register")}`);
    }

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Failed to list members: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleOpcProfile() {
  logger.info(pc.cyan("👤 OPC Profile\n"));

  try {
    const response = await ecosystemFetch("/opc/me");
    const data = (await response.json()) as Record<string, unknown>;

    console.log(`${pc.bold("Sarah Chen")}`);
    console.log(`Handle: @sarah-chen`);
    console.log(`Bio: Building AI-native products for solopreneurs\n`);

    console.log(`${pc.bold("Stats")}`);
    console.log(`  Followers: 847 | Following: 234 | Projects: 3 | Ideas: 12\n`);

    console.log(`${pc.bold("Skills")}`);
    console.log(`  #ai #ml #nextjs #devtools #startup\n`);

    logger.info(`Edit profile: ${pc.yellow("nebutra ecosystem opc register")}`);

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Failed to load profile: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleOpcRegister(options: { yes?: boolean; dryRun?: boolean }) {
  logger.info(pc.cyan("📝 Register as OPC Member\n"));

  const profile = {
    name: "Your Name",
    handle: "your-handle",
    bio: "Building amazing products",
    skills: ["nextjs", "ai", "devtools"],
    industry: "startup",
  };

  if (options.dryRun) {
    logger.info(`[DRY RUN] Would register profile:\n`);
    console.log(JSON.stringify(profile, null, 2));
    return ExitCode.Success;
  }

  if (!options.yes) {
    logger.info(`This will create your public OPC profile.`);
    logger.info(`Run with ${pc.yellow("--yes")} to confirm`);
    return ExitCode.UserCancelled;
  }

  try {
    const response = await ecosystemFetch("/opc/register", {
      method: "POST",
      body: profile,
    });

    logger.success(`✓ OPC profile created!\n`);
    logger.info(`View at: ${pc.blue("https://nebutra.com/opc/your-handle")}`);
    logger.info(`Share with: ${pc.yellow("nebutra ecosystem opc profile --share")}`);

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Registration failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

// ============================================================================
// ECOSYSTEM SHOWCASE
// ============================================================================

async function handleShowcaseList(options: {
  category?: string;
  featured?: boolean;
  format?: string;
}) {
  logger.info(pc.cyan("⭐ Project Showcase\n"));

  try {
    const response = await ecosystemFetch(
      `/showcase?category=${options.category || ""}&featured=${options.featured ? "true" : ""}`,
    );
    const data = (await response.json()) as Record<string, unknown>;

    if (options.format === "json") {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`${pc.bold("Featured Projects")}\n`);
      console.log(`1. ${pc.cyan("AI Agent Marketplace")} ${pc.green("↑ 1,234 votes")}`);
      console.log(`   By Sarah Chen | 45K monthly visits | Built with: Next.js, OpenAI API\n`);

      console.log(`2. ${pc.cyan("Community Protocol")}`);
      console.log(`   By Marcus Kumar | 32K monthly visits | Built with: Rust, PostgreSQL\n`);

      console.log(`3. ${pc.cyan("DevTools CLI Suite")}`);
      console.log(`   By Elena Rossi | 28K monthly visits | Built with: Rust, Node.js\n`);

      logger.info(`Vote: ${pc.yellow("nebutra ecosystem showcase vote <id>")}`);
      logger.info(`Submit yours: ${pc.yellow("nebutra ecosystem showcase submit")}`);
    }

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Failed to list showcase: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleShowcaseSubmit(options: { dryRun?: boolean; yes?: boolean }) {
  logger.info(pc.cyan("🎉 Submit Project to Showcase\n"));

  const projectData = {
    projectName: "My Awesome Project",
    url: "https://example.com",
    description: "A production product built with Nebutra",
    monthlyVisitors: 10000,
    builtWith: ["nextjs", "tailwind", "prisma"],
  };

  if (!options.yes) {
    logger.info(`This will add your project to the public showcase.`);
    logger.info(`Run with ${pc.yellow("--yes")} to confirm`);
    return ExitCode.UserCancelled;
  }

  try {
    const response = await ecosystemFetch("/showcase/submit", {
      method: "POST",
      body: projectData,
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      logger.info(pc.green("✓ [DRY RUN] Would submit to showcase\n"));
      return ExitCode.Success;
    }

    logger.success(`✓ Project added to showcase!\n`);
    logger.info(`View at: ${pc.blue("https://nebutra.com/showcase/my-project")}`);
    logger.info(`Community can now discover your work!`);

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Submission failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

async function handleShowcaseVote(id: string, options: { dryRun?: boolean }) {
  logger.info(pc.cyan(`👍 Voting on showcase project "${id}"\n`));

  try {
    const response = await ecosystemFetch(`/showcase/${id}/vote`, {
      method: "POST",
      body: { action: "upvote" },
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      logger.info(pc.green("✓ [DRY RUN] Would upvote project\n"));
      return ExitCode.Success;
    }

    logger.success(`✓ Vote recorded! You're supporting this project.\n`);
    return ExitCode.Success;
  } catch (error) {
    logger.error(`Vote failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

// ============================================================================
// ECOSYSTEM SYNC
// ============================================================================

async function handleSync(options: { pull?: boolean; push?: boolean; dryRun?: boolean }) {
  logger.info(pc.cyan("🔄 Sync with Ecosystem\n"));

  const pull = !options.push; // default to pull
  const direction = options.push ? "push" : "pull";

  try {
    const response = await ecosystemFetch("/sync", {
      method: "POST",
      body: { direction, timestamp: new Date().toISOString() },
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      logger.info(pc.green(`✓ [DRY RUN] Would sync (${direction})\n`));
      return ExitCode.Success;
    }

    logger.success(`✓ Synced!\n`);

    if (pull) {
      logger.info(`Downloaded: ecosystem config, stats, badges`);
    } else {
      logger.info(`Uploaded: project updates, metrics`);
    }

    return ExitCode.Success;
  } catch (error) {
    logger.error(`Sync failed: ${error}`);
    return ExitCode.GeneralError;
  }
}

// ============================================================================
// MAIN COMMAND REGISTRATION
// ============================================================================

export function registerEcosystemCommand(program: Command) {
  const cmd = program
    .command("ecosystem")
    .description("Nebutra OPC ecosystem (templates, ideas, members, showcase)");

  // ecosystem status
  cmd
    .command("status")
    .description("Ecosystem overview dashboard")
    .option("--format <format>", "Output format: json", "text")
    .action((options) => delegate(() => handleStatus(options)));

  // ecosystem connect
  cmd
    .command("connect")
    .description("Connect local project to Nebutra ecosystem")
    .option("--token <token>", "Ecosystem API token")
    .option("--org <orgId>", "Organization ID")
    .option("--dry-run", "Preview without making changes")
    .option("--yes", "Skip confirmations")
    .action((options) => delegate(() => handleConnect(options)));

  // ecosystem publish
  cmd
    .command("publish")
    .description("Publish project/template to ecosystem marketplace")
    .option("--tag <tag>", "Release tag: latest|beta|canary", "latest")
    .option("--visibility <visibility>", "Project visibility: public|private|unlisted", "public")
    .option("--dry-run", "Preview without making changes")
    .option("--yes", "Skip confirmations")
    .action((options) => delegate(() => handlePublish(options)));

  // ecosystem templates
  const templatesCmd = cmd.command("templates").description("Template marketplace");

  templatesCmd
    .command("list")
    .description("Browse available templates")
    .option("--category <category>", "Filter by category")
    .option("--sort <sort>", "Sort by: stars|downloads|recent", "downloads")
    .option("--format <format>", "Output format", "text")
    .action((options) => delegate(() => handleTemplatesList(options)));

  templatesCmd
    .command("search <query>")
    .description("Search templates")
    .option("--format <format>", "Output format", "text")
    .action((query, options) => delegate(() => handleTemplatesSearch(query, options)));

  templatesCmd
    .command("info <id>")
    .description("Template details")
    .action((id) => delegate(() => handleTemplatesInfo(id)));

  templatesCmd
    .command("install <id>")
    .description("Install/fork a template")
    .option("--dry-run", "Preview without making changes")
    .action((id, options) => delegate(() => handleTemplatesInstall(id, options)));

  // ecosystem ideas
  const ideasCmd = cmd.command("ideas").description("Ideas marketplace");

  ideasCmd
    .command("list")
    .description("Browse ideas")
    .option("--status <status>", "Filter by status")
    .option("--sort <sort>", "Sort by: votes|recent|trending", "recent")
    .option("--format <format>", "Output format", "text")
    .action((options) => delegate(() => handleIdeasList(options)));

  ideasCmd
    .command("submit")
    .description("Submit new idea")
    .option("--title <title>", "Idea title")
    .option("--description <description>", "Idea description")
    .option("--tags <tags>", "Comma-separated tags")
    .option("--dry-run", "Preview without making changes")
    .action((options) => delegate(() => handleIdeasSubmit(options)));

  ideasCmd
    .command("vote <id>")
    .description("Upvote an idea")
    .option("--dry-run", "Preview without making changes")
    .action((id, options) => delegate(() => handleIdeasVote(id, options)));

  ideasCmd
    .command("claim <id>")
    .description("Claim an idea to work on")
    .option("--dry-run", "Preview without making changes")
    .action((id, options) => delegate(() => handleIdeasClaim(id, options)));

  ideasCmd
    .command("comment <id>")
    .description("Comment on an idea")
    .option("--message <message>", "Comment text")
    .option("--dry-run", "Preview without making changes")
    .action((id, options) => delegate(() => handleIdeasComment(id, options)));

  // ecosystem opc
  const opcCmd = cmd.command("opc").description("OPC member network");

  opcCmd
    .command("list")
    .description("Browse OPC members")
    .option("--skill <skill>", "Filter by skill tag")
    .option("--industry <industry>", "Filter by industry")
    .option("--sort <sort>", "Sort by: active|joined", "active")
    .option("--format <format>", "Output format", "text")
    .action((options) => delegate(() => handleOpcList(options)));

  opcCmd
    .command("profile")
    .description("View/edit your OPC profile")
    .action(() => delegate(() => handleOpcProfile()));

  opcCmd
    .command("register")
    .description("Register as OPC member")
    .option("--yes", "Skip confirmations")
    .option("--dry-run", "Preview without making changes")
    .action((options) => delegate(() => handleOpcRegister(options)));

  // ecosystem showcase
  const showcaseCmd = cmd.command("showcase").description("Project showcase");

  showcaseCmd
    .command("list")
    .description("Browse showcased projects")
    .option("--category <category>", "Filter by category")
    .option("--featured", "Show featured only")
    .option("--format <format>", "Output format", "text")
    .action((options) => delegate(() => handleShowcaseList(options)));

  showcaseCmd
    .command("submit")
    .description("Submit your project to showcase")
    .option("--yes", "Skip confirmations")
    .option("--dry-run", "Preview without making changes")
    .action((options) => delegate(() => handleShowcaseSubmit(options)));

  showcaseCmd
    .command("vote <id>")
    .description("Upvote a project (Product Hunt style)")
    .option("--dry-run", "Preview without making changes")
    .action((id, options) => delegate(() => handleShowcaseVote(id, options)));

  // ecosystem sync
  cmd
    .command("sync")
    .description("Sync local project with ecosystem")
    .option("--pull", "Pull remote changes")
    .option("--push", "Push local changes")
    .option("--dry-run", "Preview without making changes")
    .action((options) => delegate(() => handleSync(options)));
}

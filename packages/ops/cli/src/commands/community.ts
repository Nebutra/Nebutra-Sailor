import type { Command } from "commander";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

const API_BASE_URL = process.env.NEBUTRA_API_URL || "http://localhost:3001/api";

/** Commander option bags for community subcommands (no any). */
type CommunityOptions = {
  status?: string;
  category?: string;
  type?: string;
  action?: string;
  role?: string;
  sort?: string;
  period?: string;
  format?: string;
  yes?: boolean;
  reason?: string;
  dryRun?: boolean;
  threshold?: string | number;
};

type CommunityJson = Record<string, unknown>;

function asList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.map((item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? (item as Record<string, unknown>)
      : {},
  );
}

function asMetrics(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

function str(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

/**
 * Helper to make authenticated requests to the API gateway
 */
async function adminFetch(endpoint: string, options: RequestInit = {}): Promise<CommunityJson> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEBUTRA_ADMIN_TOKEN || ""}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`API Error (${response.status}): ${error}`);
  }

  const body: unknown = await response.json();
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as CommunityJson;
  }
  return { value: body };
}

/**
 * Compute community health score (0-100) from metrics
 */
function computeHealthScore(metrics: Record<string, number>): {
  score: number;
  breakdown: Record<string, number>;
} {
  const weights = {
    dau_retention: 0.25,
    engagement_rate: 0.25,
    content_velocity: 0.2,
    response_time: 0.15,
    member_retention: 0.15,
  };

  const breakdown: Record<string, number> = {};
  let totalScore = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const normalized = Math.min(100, (metrics[key] || 0) * 100);
    breakdown[key] = normalized;
    totalScore += normalized * weight;
  }

  return { score: Math.round(totalScore), breakdown };
}

/**
 * Format showcase status badge
 */
function _formatStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    pending: pc.yellow("● pending"),
    approved: pc.green("✓ approved"),
    rejected: pc.red("✗ rejected"),
    featured: pc.cyan("⭐ featured"),
  };
  return badges[status] || status;
}

/**
 * Format content type badge
 */
function _formatTypeBadge(type: string): string {
  const badges: Record<string, string> = {
    article: pc.blue("📄 article"),
    discussion: pc.green("💬 discussion"),
    announcement: pc.cyan("📢 announcement"),
  };
  return badges[type] || type;
}

/**
 * Showcase subcommands
 */
async function handleShowcaseList(options: CommunityOptions) {
  try {
    logger.info("Fetching showcase submissions...");
    const params = new URLSearchParams();
    if (options.status) params.append("status", options.status);
    if (options.category) params.append("category", options.category);

    const data = await adminFetch(`/community/showcase?${params.toString()}`);

    if (asList(data.submissions).length === 0) {
      logger.warn("No showcase submissions found");
      return ExitCode.SUCCESS;
    }

    logger.info(`\nShowcase Submissions (${asList(data.submissions).length})\n`);
    for (const _submission of asList(data.submissions)) {
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to list showcase: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleShowcaseApprove(id: string, options: CommunityOptions) {
  try {
    if (!options.yes) {
      logger.warn(`Approve showcase submission ${id}? Use --yes to confirm`);
      return ExitCode.SUCCESS;
    }

    logger.info(`Approving showcase submission ${id}...`);
    const result = await adminFetch(`/community/showcase/${id}/approve`, {
      method: "POST",
    });

    logger.success(`Approved: ${result.title}`);
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to approve showcase: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleShowcaseReject(id: string, options: CommunityOptions) {
  try {
    if (!options.yes) {
      logger.warn(`Reject showcase submission ${id}? Use --yes to confirm`);
      return ExitCode.SUCCESS;
    }

    const reason = options.reason || "Does not meet guidelines";
    logger.info(`Rejecting showcase submission ${id}...`);

    const result = await adminFetch(`/community/showcase/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });

    logger.success(`Rejected: ${result.title}`);
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to reject showcase: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleShowcaseFeature(id: string, options: CommunityOptions) {
  try {
    if (!options.yes) {
      logger.warn(`Mark showcase as featured: ${id}? Use --yes to confirm`);
      return ExitCode.SUCCESS;
    }

    logger.info(`Featuring showcase submission ${id}...`);
    const result = await adminFetch(`/community/showcase/${id}/feature`, {
      method: "POST",
    });

    logger.success(`Featured: ${result.title}`);
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to feature showcase: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleShowcaseStats(_options: CommunityOptions) {
  try {
    logger.info("Fetching showcase statistics...");
    const _data = await adminFetch("/community/showcase/stats");

    logger.info("\nShowcase Statistics\n");

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to fetch showcase stats: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

/**
 * Content subcommands
 */
async function handleContentList(options: CommunityOptions) {
  try {
    logger.info("Fetching community content...");
    const params = new URLSearchParams();
    if (options.status) params.append("status", options.status);
    if (options.type) params.append("type", options.type);

    const data = await adminFetch(`/community/content?${params.toString()}`);

    if (asList(data.items).length === 0) {
      logger.warn("No content found");
      return ExitCode.SUCCESS;
    }

    logger.info(`\nCommunity Content (${asList(data.items).length})\n`);
    for (const _item of asList(data.items)) {
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to list content: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleContentModerate(id: string, options: CommunityOptions) {
  try {
    const validActions = ["approve", "flag", "archive", "delete"];
    if (!options.action || !validActions.includes(options.action)) {
      logger.error(`Invalid action. Must be one of: ${validActions.join(", ")}`);
      return ExitCode.ERROR;
    }

    if (!options.yes) {
      logger.warn(`${options.action} content ${id}? Use --yes to confirm`);
      return ExitCode.SUCCESS;
    }

    logger.info(`Moderating content ${id} (${options.action})...`);
    const result = await adminFetch(`/community/content/${id}/moderate`, {
      method: "POST",
      body: JSON.stringify({ action: options.action }),
    });

    logger.success(`Content ${options.action}d: ${result.title}`);
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to moderate content: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleContentPublish(id: string, options: CommunityOptions) {
  try {
    if (!options.yes) {
      logger.warn(`Publish content ${id}? Use --yes to confirm`);
      return ExitCode.SUCCESS;
    }

    logger.info(`Publishing content ${id}...`);
    const result = await adminFetch(`/community/content/${id}/publish`, {
      method: "POST",
    });

    logger.success(`Published: ${result.title}`);
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to publish content: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleContentAnalytics(options: CommunityOptions) {
  try {
    logger.info("Fetching content analytics...");
    const data = await adminFetch("/community/content/analytics");

    logger.info("\nContent Performance Metrics\n");

    for (const _item of asList(data.topContent).slice(0, 5)) {
    }

    if (options.format === "json") {
    }
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to fetch analytics: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

/**
 * Members subcommands
 */
async function handleMembersList(options: CommunityOptions) {
  try {
    logger.info("Fetching community members...");
    const params = new URLSearchParams();
    if (options.role) params.append("role", options.role);
    if (options.sort) params.append("sort", options.sort);

    const data = await adminFetch(`/community/members?${params.toString()}`);

    if (asList(data.members).length === 0) {
      logger.warn("No members found");
      return ExitCode.SUCCESS;
    }

    logger.info(`\nCommunity Members (${asList(data.members).length})\n`);
    for (const member of asList(data.members)) {
      const roleColorMap: Record<string, (s: string) => string> = {
        owner: pc.red,
        admin: pc.yellow,
        moderator: pc.blue,
        member: pc.gray,
      };
      const _roleColor = roleColorMap[String(member.role)] ?? pc.gray;
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to list members: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleMemberProfile(userId: string, _options: CommunityOptions) {
  try {
    logger.info(`Fetching profile for ${userId}...`);
    const _data = await adminFetch(`/community/members/${userId}`);

    logger.info(`\nMember Profile\n`);

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to fetch member profile: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleMemberRole(userId: string, role: string, options: CommunityOptions) {
  try {
    const validRoles = ["member", "moderator", "admin", "owner"];
    if (!validRoles.includes(role)) {
      logger.error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
      return ExitCode.ERROR;
    }

    if (!options.yes) {
      logger.warn(`Change ${userId} role to ${role}? Use --yes to confirm`);
      return ExitCode.SUCCESS;
    }

    logger.info(`Updating member role...`);
    const result = await adminFetch(`/community/members/${userId}/role`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });

    logger.success(`Updated ${result.name} → ${pc.bold(role)}`);
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to update member role: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleMemberInvite(email: string, _options: CommunityOptions) {
  try {
    logger.info(`Sending invite to ${email}...`);
    const _result = await adminFetch("/community/members/invite", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    logger.success(`Invite sent to ${email}`);
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to send invite: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleMemberBan(userId: string, options: CommunityOptions) {
  try {
    if (!options.yes) {
      logger.warn(`Ban member ${userId}? Use --yes to confirm`);
      return ExitCode.SUCCESS;
    }

    const reason = options.reason || "Violation of community guidelines";
    logger.info(`Banning member ${userId}...`);

    const result = await adminFetch(`/community/members/${userId}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });

    logger.success(`Banned: ${result.name}`);
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to ban member: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

/**
 * Health subcommand
 */
async function handleCommunityHealth(options: CommunityOptions) {
  try {
    logger.info("Computing community health score...");

    const period = options.period || "30d";
    const data = await adminFetch(`/community/health?period=${period}`);

    const { score, breakdown } = computeHealthScore(asMetrics(data.metrics));

    logger.info(`\nCommunity Health Report (${period})\n`);
    for (const [key, value] of Object.entries(breakdown)) {
      const _label = key.replace(/_/g, " ").toLowerCase();
      const _bar = "█".repeat(Math.round(value / 5)) + "░".repeat(20 - Math.round(value / 5));
    }

    if (options.format === "json") {
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to compute health: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

/**
 * Moderation subcommands
 */
async function handleModerationQueue(_options: CommunityOptions) {
  try {
    logger.info("Fetching moderation queue...");
    const data = await adminFetch("/community/moderation/queue");

    if (asList(data.items).length === 0) {
      logger.success("No pending moderation items");
      return ExitCode.SUCCESS;
    }

    logger.info(`\nModeration Queue (${asList(data.items).length} pending)\n`);
    for (const item of asList(data.items)) {
      const severityMap: Record<string, string> = {
        low: pc.gray("●"),
        medium: pc.yellow("●"),
        high: pc.red("●"),
      };
      const _severity = severityMap[String(item.severity)] ?? "●";
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to fetch queue: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleModerationAuto(options: CommunityOptions) {
  try {
    logger.info("Running AI-assisted moderation sweep...");

    if (options.dryRun) {
      logger.warn("DRY RUN MODE - no changes will be made");
    }

    const _result = await adminFetch("/community/moderation/auto", {
      method: "POST",
      body: JSON.stringify({ dryRun: options.dryRun || false }),
    });

    logger.info("\nModeration Results\n");

    if (options.dryRun) {
      logger.info("DRY RUN COMPLETE - no changes committed");
    } else {
      logger.success("Moderation sweep complete");
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to run moderation: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

/**
 * Register community command with all subcommands
 */
export function registerCommunityCommand(program: Command) {
  const community = program
    .command("community")
    .description("Manage Nebutra-Sailor community dimension");

  // Showcase subcommands
  const showcase = community.command("showcase").description("Project showcase management");

  showcase
    .command("list")
    .description("List submitted projects")
    .option("--status <status>", "Filter by status (pending|approved|rejected|featured)")
    .option("--category <category>", "Filter by category")
    .action((options) => handleShowcaseList(options).then(process.exit));

  showcase
    .command("approve <id>")
    .description("Approve a showcase submission")
    .option("--yes", "Skip confirmation")
    .action((id, options) => handleShowcaseApprove(id, options).then(process.exit));

  showcase
    .command("reject <id>")
    .description("Reject a showcase submission")
    .option("--reason <text>", "Rejection reason")
    .option("--yes", "Skip confirmation")
    .action((id, options) => handleShowcaseReject(id, options).then(process.exit));

  showcase
    .command("feature <id>")
    .description("Mark as featured")
    .option("--yes", "Skip confirmation")
    .action((id, options) => handleShowcaseFeature(id, options).then(process.exit));

  showcase
    .command("stats")
    .description("Showcase engagement metrics")
    .action((options) => handleShowcaseStats(options).then(process.exit));

  // Content subcommands
  const content = community.command("content").description("Content moderation pipeline");

  content
    .command("list")
    .description("List community content")
    .option("--status <status>", "Filter by status (draft|published|flagged|archived)")
    .option("--type <type>", "Filter by type (article|discussion|announcement)")
    .action((options) => handleContentList(options).then(process.exit));

  content
    .command("moderate <id>")
    .description("Moderate content")
    .option("--action <action>", "Action (approve|flag|archive|delete)")
    .option("--yes", "Skip confirmation")
    .action((id, options) => handleContentModerate(id, options).then(process.exit));

  content
    .command("publish <id>")
    .description("Publish approved content")
    .option("--yes", "Skip confirmation")
    .action((id, options) => handleContentPublish(id, options).then(process.exit));

  content
    .command("analytics")
    .description("Content performance metrics")
    .option("--format <format>", "Output format (json|text)")
    .action((options) => handleContentAnalytics(options).then(process.exit));

  // Members subcommands
  const members = community.command("members").description("Member management");

  members
    .command("list")
    .description("List members")
    .option("--role <role>", "Filter by role (member|admin|owner|moderator)")
    .option("--sort <sort>", "Sort by (engagement|joined|name)")
    .action((options) => handleMembersList(options).then(process.exit));

  members
    .command("profile <userId>")
    .description("View member profile + activity")
    .action((userId, options) => handleMemberProfile(userId, options).then(process.exit));

  members
    .command("role <userId> <role>")
    .description("Update member role")
    .option("--yes", "Skip confirmation")
    .action((userId, role, options) => handleMemberRole(userId, role, options).then(process.exit));

  members
    .command("invite <email>")
    .description("Invite to community")
    .action((email, options) => handleMemberInvite(email, options).then(process.exit));

  members
    .command("ban <userId>")
    .description("Ban member")
    .option("--reason <text>", "Ban reason")
    .option("--yes", "Skip confirmation")
    .action((userId, options) => handleMemberBan(userId, options).then(process.exit));

  // Health subcommand
  community
    .command("health")
    .description("Community health dashboard")
    .option("--period <period>", "Time period (7d|30d|90d)", "30d")
    .option("--format <format>", "Output format (json|text)")
    .action((options) => handleCommunityHealth(options).then(process.exit));

  // Moderation subcommands
  const moderate = community.command("moderate").description("AI-assisted moderation queue");

  moderate
    .command("queue")
    .description("Show pending moderation items")
    .action((options) => handleModerationQueue(options).then(process.exit));

  moderate
    .command("auto")
    .description("Run AI moderation sweep")
    .option("--dry-run", "Preview without committing")
    .action((options) => handleModerationAuto(options).then(process.exit));
}

import type { Command } from "commander";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

const API_BASE_URL = process.env.NEBUTRA_API_URL || "http://localhost:3001/api";

/**
 * Helper to make authenticated requests to the API gateway
 */
async function adminFetch(endpoint: string, options: RequestInit = {}) {
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

  return response.json();
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
function formatStatusBadge(status: string): string {
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
function formatTypeBadge(type: string): string {
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
async function handleShowcaseList(options: any) {
  try {
    logger.info("Fetching showcase submissions...");
    const params = new URLSearchParams();
    if (options.status) params.append("status", options.status);
    if (options.category) params.append("category", options.category);

    const data = await adminFetch(`/community/showcase?${params.toString()}`);

    if (!data.submissions || data.submissions.length === 0) {
      logger.warn("No showcase submissions found");
      return ExitCode.SUCCESS;
    }

    logger.info(`\nShowcase Submissions (${data.submissions.length})\n`);
    for (const submission of data.submissions) {
      logger.info(
        `${formatStatusBadge(String(submission.status))} ${pc.bold(String(submission.title))} ${pc.dim(`(${submission.id})`)}`,
      );
      if (submission.category) {
        logger.info(`  ${pc.dim("category:")} ${submission.category}`);
      }
      if (submission.author) {
        logger.info(`  ${pc.dim("author:")} ${submission.author}`);
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to list showcase: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleShowcaseApprove(id: string, options: any) {
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

async function handleShowcaseReject(id: string, options: any) {
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

async function handleShowcaseFeature(id: string, options: any) {
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

async function handleShowcaseStats(_options: any) {
  try {
    logger.info("Fetching showcase statistics...");
    const data = await adminFetch("/community/showcase/stats");

    logger.info("\nShowcase Statistics\n");
    for (const [key, value] of Object.entries(data)) {
      const label = key.replace(/_/g, " ");
      logger.info(`  ${pc.dim(label)}: ${pc.bold(String(value))}`);
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to fetch showcase stats: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

/**
 * Content subcommands
 */
async function handleContentList(options: any) {
  try {
    logger.info("Fetching community content...");
    const params = new URLSearchParams();
    if (options.status) params.append("status", options.status);
    if (options.type) params.append("type", options.type);

    const data = await adminFetch(`/community/content?${params.toString()}`);

    if (!data.items || data.items.length === 0) {
      logger.warn("No content found");
      return ExitCode.SUCCESS;
    }

    logger.info(`\nCommunity Content (${data.items.length})\n`);
    for (const item of data.items) {
      logger.info(
        `${formatTypeBadge(String(item.type))} ${pc.bold(String(item.title))} ${pc.dim(`(${item.id})`)}`,
      );
      if (item.status) {
        logger.info(`  ${pc.dim("status:")} ${formatStatusBadge(String(item.status))}`);
      }
      if (item.author) {
        logger.info(`  ${pc.dim("author:")} ${item.author}`);
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to list content: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleContentModerate(id: string, options: any) {
  try {
    const validActions = ["approve", "flag", "archive", "delete"];
    if (!validActions.includes(options.action)) {
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

async function handleContentPublish(id: string, options: any) {
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

async function handleContentAnalytics(options: any) {
  try {
    logger.info("Fetching content analytics...");
    const data = await adminFetch("/community/content/analytics");

    logger.info("\nContent Performance Metrics\n");

    for (const item of data.topContent.slice(0, 5)) {
      logger.info(`${pc.bold(String(item.title))} ${pc.dim(`(${item.id})`)}`);
      logger.info(
        `  ${pc.dim("views:")} ${item.views ?? 0}  ${pc.dim("engagement:")} ${item.engagement ?? 0}`,
      );
    }

    if (options.format === "json") {
      console.log(JSON.stringify(data, null, 2));
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
async function handleMembersList(options: any) {
  try {
    logger.info("Fetching community members...");
    const params = new URLSearchParams();
    if (options.role) params.append("role", options.role);
    if (options.sort) params.append("sort", options.sort);

    const data = await adminFetch(`/community/members?${params.toString()}`);

    if (!data.members || data.members.length === 0) {
      logger.warn("No members found");
      return ExitCode.SUCCESS;
    }

    logger.info(`\nCommunity Members (${data.members.length})\n`);
    for (const member of data.members) {
      const roleColorMap: Record<string, (s: string) => string> = {
        owner: pc.red,
        admin: pc.yellow,
        moderator: pc.blue,
        member: pc.gray,
      };
      const roleColor = roleColorMap[String(member.role)] ?? pc.gray;
      logger.info(
        `${roleColor(`[${member.role}]`)} ${pc.bold(String(member.name))} ${pc.dim(`(${member.id})`)}`,
      );
      if (member.email) {
        logger.info(`  ${pc.dim("email:")} ${member.email}`);
      }
      if (member.engagement !== undefined) {
        logger.info(`  ${pc.dim("engagement:")} ${member.engagement}`);
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to list members: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleMemberProfile(userId: string, _options: any) {
  try {
    logger.info(`Fetching profile for ${userId}...`);
    const data = await adminFetch(`/community/members/${userId}`);

    logger.info(`\nMember Profile\n`);
    logger.info(`  ${pc.bold(String(data.name))} ${pc.dim(`(${data.id})`)}`);
    if (data.role) {
      logger.info(`  ${pc.dim("role:")} ${data.role}`);
    }
    if (data.email) {
      logger.info(`  ${pc.dim("email:")} ${data.email}`);
    }
    if (data.joinedAt) {
      logger.info(`  ${pc.dim("joined:")} ${data.joinedAt}`);
    }
    if (data.engagement !== undefined) {
      logger.info(`  ${pc.dim("engagement:")} ${data.engagement}`);
    }
    if (Array.isArray(data.activity)) {
      logger.info(`\n  ${pc.dim("Recent Activity")}`);
      for (const entry of data.activity) {
        logger.info(
          `    ${pc.dim(String(entry.timestamp ?? ""))} ${entry.description ?? entry.type ?? ""}`,
        );
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to fetch member profile: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleMemberRole(userId: string, role: string, options: any) {
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

async function handleMemberInvite(email: string, _options: any) {
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

async function handleMemberBan(userId: string, options: any) {
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
async function handleCommunityHealth(options: any) {
  try {
    logger.info("Computing community health score...");

    const period = options.period || "30d";
    const data = await adminFetch(`/community/health?period=${period}`);

    const { score, breakdown } = computeHealthScore(data.metrics);

    logger.info(`\nCommunity Health Report (${period})\n`);
    logger.info(`  ${pc.bold("Overall Score")}: ${pc.bold(String(score))}/100\n`);
    for (const [key, value] of Object.entries(breakdown)) {
      const label = key.replace(/_/g, " ").toLowerCase();
      const filled = Math.round(value / 5);
      const bar = "█".repeat(filled) + "░".repeat(20 - filled);
      logger.info(`  ${label.padEnd(20)} ${bar} ${Math.round(value)}`);
    }

    if (options.format === "json") {
      console.log(JSON.stringify({ score, breakdown, metrics: data.metrics }, null, 2));
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
async function handleModerationQueue(_options: any) {
  try {
    logger.info("Fetching moderation queue...");
    const data = await adminFetch("/community/moderation/queue");

    if (!data.items || data.items.length === 0) {
      logger.success("No pending moderation items");
      return ExitCode.SUCCESS;
    }

    logger.info(`\nModeration Queue (${data.items.length} pending)\n`);
    for (const item of data.items) {
      const severityMap: Record<string, string> = {
        low: pc.gray("●"),
        medium: pc.yellow("●"),
        high: pc.red("●"),
      };
      const severity = severityMap[String(item.severity)] ?? "●";
      logger.info(
        `${severity} ${pc.bold(String(item.type ?? "item"))} ${pc.dim(`(${item.id})`)} — ${item.reason ?? ""}`,
      );
      if (item.reportedBy) {
        logger.info(`  ${pc.dim("reported by:")} ${item.reportedBy}`);
      }
      if (item.createdAt) {
        logger.info(`  ${pc.dim("created:")} ${item.createdAt}`);
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Failed to fetch queue: ${(error as Error).message}`);
    return ExitCode.ERROR;
  }
}

async function handleModerationAuto(options: any) {
  try {
    logger.info("Running AI-assisted moderation sweep...");

    if (options.dryRun) {
      logger.warn("DRY RUN MODE - no changes will be made");
    }

    const result = await adminFetch("/community/moderation/auto", {
      method: "POST",
      body: JSON.stringify({ dryRun: options.dryRun || false }),
    });

    logger.info("\nModeration Results\n");
    if (Array.isArray(result.actions)) {
      for (const action of result.actions) {
        logger.info(
          `  ${pc.bold(String(action.action ?? "action"))} → ${action.target ?? action.id ?? ""} ${pc.dim(action.reason ? `(${action.reason})` : "")}`,
        );
      }
    }
    if (result.summary) {
      for (const [key, value] of Object.entries(result.summary as Record<string, unknown>)) {
        logger.info(`  ${pc.dim(key.replace(/_/g, " "))}: ${pc.bold(String(value))}`);
      }
    }

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

import type { Command } from "commander";
import pc from "picocolors";
import { delegate, findMonorepoRoot } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

/**
 * Growth metrics dashboard — 2026 Silicon Valley growth engineering patterns
 * Integrates with ClickHouse for real-time metrics, Resend for newsletters, and AI for insights
 */

interface GrowthMetrics {
  signups: number;
  signups_delta: number;
  activations: number;
  activations_delta: number;
  conversions: number;
  conversions_delta: number;
  revenue: number;
  revenue_delta: number;
  active_users: number;
  active_users_delta: number;
  total_events: number;
  period: string;
}

interface FunnelStep {
  name: string;
  count: number;
  rate: number;
  dropoff_rate: number;
}

interface CohortRow {
  cohort: string;
  [key: string]: number | string;
}

interface NewsletterStats {
  subscribers: number;
  open_rate: number;
  click_rate: number;
  unsubscribe_rate: number;
}

interface ReferralMetrics {
  invites_sent: number;
  invites_converted: number;
  viral_coefficient: number;
  reward_type: string;
  reward_amount: number;
}

interface ExperimentResult {
  id: string;
  name: string;
  variants: string[];
  metric: string;
  status: "running" | "concluded";
  winner?: string;
  significance?: number;
}

interface GrowthInsight {
  focus: string;
  insights: string[];
  recommendations: string[];
  confidence: number;
}

/** Fetch growth metrics from the platform API */
async function growthFetch<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: Record<string, unknown>;
    query?: Record<string, string>;
  },
): Promise<T> {
  const root = await findMonorepoRoot();
  const url = new URL(endpoint, "http://localhost:3000/api/growth");
  if (options?.query) {
    Object.entries(options.query).forEach(([k, v]) => {
      url.searchParams.set(k, v);
    });
  }

  const response = await fetch(url, {
    method: options?.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Growth API error (${response.status}): ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

/** Format a metric delta as a colored indicator */
function formatDelta(delta: number, prefix = ""): string {
  if (delta > 0) return pc.green(`▲ +${delta}${prefix}`);
  if (delta < 0) return pc.red(`▼ ${delta}${prefix}`);
  return pc.gray(`→ 0${prefix}`);
}

/** Format a percentage with color coding */
function formatPercent(value: number, threshold = 0.5): string {
  const pct = (value * 100).toFixed(1);
  if (value >= threshold) return pc.green(`${pct}%`);
  return pc.yellow(`${pct}%`);
}

/** Generate a mini sparkline-style indicator */
function sparkline(value: number, max: number): string {
  const bars = "▁▂▃▄▅▆▇█";
  const index = Math.floor((value / max) * (bars.length - 1));
  return bars[index];
}

/** Dashboard subcommand — Growth metrics overview */
async function dashboardCommand(options: Record<string, unknown>): Promise<number> {
  try {
    const period = (options.period as string) || "7d";
    const compare = options.compare as boolean;

    logger.info(`Fetching growth metrics for ${period}...`);

    const metrics = await growthFetch<GrowthMetrics>("/summary", {
      query: { period, compare: compare ? "true" : "false" },
    });

    console.log("\n" + pc.bold(pc.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")));
    console.log(pc.bold(pc.cyan("  Growth Dashboard")) + pc.gray(` (${period})`));
    console.log(pc.bold(pc.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")) + "\n");

    // Signups row
    console.log(
      `${sparkline(metrics.signups, 1000)} ${pc.bold("Signups")}       ${pc.cyan(String(metrics.signups).padStart(8))}   ${formatDelta(metrics.signups_delta)}`,
    );

    // Activations row
    console.log(
      `${sparkline(metrics.activations, 500)} ${pc.bold("Activations")}   ${pc.cyan(String(metrics.activations).padStart(8))}   ${formatDelta(metrics.activations_delta)}`,
    );

    // Conversions row
    console.log(
      `${sparkline(metrics.conversions, 200)} ${pc.bold("Conversions")}   ${pc.cyan(String(metrics.conversions).padStart(8))}   ${formatDelta(metrics.conversions_delta)}`,
    );

    // Revenue row
    console.log(
      `${sparkline(metrics.revenue, 100000)} ${pc.bold("Revenue")}       ${pc.cyan(`$${(metrics.revenue / 1000).toFixed(1)}k`.padStart(8))}   ${formatDelta(metrics.revenue_delta, "")}`,
    );

    // Active Users row
    console.log(
      `${sparkline(metrics.active_users, 1000)} ${pc.bold("Active Users")}  ${pc.cyan(String(metrics.active_users).padStart(8))}   ${formatDelta(metrics.active_users_delta)}`,
    );

    // Total Events row
    console.log(
      `${sparkline(metrics.total_events, 100000)} ${pc.bold("Total Events")}  ${pc.cyan(String(metrics.total_events).padStart(8))}   ${formatDelta(metrics.total_events_delta)}`,
    );

    console.log();
    return ExitCode.Success;
  } catch (error) {
    logger.error(`Dashboard error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.Failure;
  }
}

/** Funnel subcommand — Conversion funnel analysis */
async function funnelCommand(options: Record<string, unknown>): Promise<number> {
  try {
    const period = (options.period as string) || "7d";
    const segment = (options.segment as string) || "all";

    logger.info(`Fetching funnel data for ${period} (${segment})...`);

    const funnel = await growthFetch<FunnelStep[]>("/funnel", {
      query: { period, segment },
    });

    console.log("\n" + pc.bold(pc.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")));
    console.log(pc.bold(pc.cyan("  Conversion Funnel")) + pc.gray(` (${period}, ${segment})`));
    console.log(pc.bold(pc.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")) + "\n");

    funnel.forEach((step, idx) => {
      const bars = "█".repeat(Math.ceil(step.rate * 20));
      const empty = "░".repeat(20 - Math.ceil(step.rate * 20));
      const dropoff =
        idx < funnel.length - 1 ? pc.red(`↓ ${(step.dropoff_rate * 100).toFixed(1)}% drop`) : "";

      console.log(
        `${idx + 1}. ${pc.bold(step.name.padEnd(15))} ${pc.cyan(bars + empty)} ${formatPercent(step.rate)}  ${step.count.toLocaleString().padStart(8)} ${dropoff}`,
      );
    });

    // Suggestion for highest dropoff
    const maxDropoff = funnel.reduce((max, step) =>
      step.dropoff_rate > max.dropoff_rate ? step : max,
    );
    if (maxDropoff.dropoff_rate > 0.2) {
      console.log(
        `\n${pc.yellow("⚠️  High drop-off")} at ${maxDropoff.name} (${(maxDropoff.dropoff_rate * 100).toFixed(1)}%)`,
      );
      console.log(`   Consider: A/B test messaging, onboarding flow, or value prop`);
    }

    console.log();
    return ExitCode.Success;
  } catch (error) {
    logger.error(`Funnel error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.Failure;
  }
}

/** Cohort subcommand — Cohort retention analysis */
async function cohortCommand(options: Record<string, unknown>): Promise<number> {
  try {
    const period = (options.period as string) || "weekly";
    const cohortsCount = parseInt(options.cohorts as string) || 8;

    logger.info(`Fetching ${period} cohort data (${cohortsCount} cohorts)...`);

    const cohorts = await growthFetch<CohortRow[]>("/cohort", {
      query: { period, cohorts: String(cohortsCount) },
    });

    console.log("\n" + pc.bold(pc.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")));
    console.log(pc.bold(pc.cyan("  Cohort Retention Heatmap")) + pc.gray(` (${period})`));
    console.log(pc.bold(pc.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")) + "\n");

    if (cohorts.length === 0) {
      console.log(pc.gray("No cohort data available."));
      return ExitCode.Success;
    }

    // Print header
    const headers = Object.keys(cohorts[0]).slice(1);
    console.log(pc.gray("Cohort".padEnd(15)) + headers.map((h) => pc.gray(h.padEnd(8))).join(" "));

    // Print each cohort row with color-coded retention
    cohorts.forEach((row) => {
      const cohortName = String(row.cohort);
      let line = cohortName.padEnd(15);

      headers.forEach((h) => {
        const val = row[h];
        if (typeof val === "number") {
          const retention = val / 100;
          let colored = String(Math.round(val)).padEnd(8);

          if (retention >= 0.7) {
            colored = pc.green(colored);
          } else if (retention >= 0.4) {
            colored = pc.yellow(colored);
          } else {
            colored = pc.red(colored);
          }
          line += colored + " ";
        }
      });

      console.log(line);
    });

    console.log();
    return ExitCode.Success;
  } catch (error) {
    logger.error(`Cohort error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.Failure;
  }
}

/** Newsletter subcommand — Newsletter management */
async function newsletterCommand(
  subcommand: string,
  options: Record<string, unknown>,
): Promise<number> {
  try {
    if (subcommand === "stats") {
      logger.info("Fetching newsletter stats...");

      const stats = await growthFetch<NewsletterStats>("/newsletter/stats");

      console.log("\n" + pc.bold(pc.cyan("  Newsletter Stats\n")));
      console.log(`Subscribers:      ${pc.cyan(stats.subscribers.toLocaleString())}`);
      console.log(`Open Rate:        ${formatPercent(stats.open_rate, 0.2)}`);
      console.log(`Click Rate:       ${formatPercent(stats.click_rate, 0.05)}`);
      console.log(`Unsubscribe Rate: ${formatPercent(stats.unsubscribe_rate, 0.01)}`);
      console.log();
      return ExitCode.Success;
    }

    if (subcommand === "subscribers") {
      const limit = parseInt(options.limit as string) || 10;
      const offset = parseInt(options.offset as string) || 0;

      logger.info(`Fetching ${limit} newsletter subscribers (offset ${offset})...`);

      const subscribers = await growthFetch<Array<{ email: string; subscribed_at: string }>>(
        "/newsletter/subscribers",
        {
          query: { limit: String(limit), offset: String(offset) },
        },
      );

      console.log("\n" + pc.bold(pc.cyan("  Newsletter Subscribers\n")));
      subscribers.forEach((sub) => {
        console.log(`  ${sub.email.padEnd(32)} ${pc.gray(sub.subscribed_at)}`);
      });
      console.log();
      return ExitCode.Success;
    }

    if (subcommand === "send") {
      const template = options.template as string;
      if (!template) {
        logger.error("--template is required");
        return ExitCode.Failure;
      }

      if (!options.yes) {
        logger.warn("Use --yes to confirm newsletter send");
        return ExitCode.Failure;
      }

      logger.info(`Sending newsletter with template: ${template}`);

      await growthFetch("/newsletter/send", {
        method: "POST",
        body: { template_id: template },
      });

      console.log(pc.green("✓ Newsletter sent successfully"));
      console.log();
      return ExitCode.Success;
    }

    logger.error(`Unknown newsletter subcommand: ${subcommand}`);
    return ExitCode.Failure;
  } catch (error) {
    logger.error(`Newsletter error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.Failure;
  }
}

/** Referral subcommand — Referral program management */
async function referralCommand(
  subcommand: string,
  options: Record<string, unknown>,
): Promise<number> {
  try {
    if (subcommand === "status") {
      logger.info("Fetching referral program status...");

      const referral = await growthFetch<ReferralMetrics>("/referral/status");

      console.log("\n" + pc.bold(pc.cyan("  Referral Program\n")));
      console.log(`Invites Sent:      ${pc.cyan(referral.invites_sent.toLocaleString())}`);
      console.log(`Invites Converted: ${pc.green(referral.invites_converted.toLocaleString())}`);
      console.log(`Viral Coefficient: ${formatPercent(referral.viral_coefficient, 0.3)}`);
      console.log(`Reward:            ${referral.reward_type} ${referral.reward_amount}`);
      console.log();
      return ExitCode.Success;
    }

    if (subcommand === "config") {
      logger.info("Fetching referral config...");

      const config = await growthFetch<Record<string, unknown>>("/referral/config");

      console.log("\n" + pc.bold(pc.cyan("  Referral Configuration\n")));
      Object.entries(config).forEach(([key, value]) => {
        console.log(`${key.padEnd(20)} ${pc.cyan(String(value))}`);
      });
      console.log();
      return ExitCode.Success;
    }

    if (subcommand === "leaderboard") {
      logger.info("Fetching referral leaderboard...");

      const leaderboard =
        await growthFetch<Array<{ rank: number; name: string; referrals: number }>>(
          "/referral/leaderboard",
        );

      console.log("\n" + pc.bold(pc.cyan("  Top Referrers\n")));
      leaderboard.forEach((entry) => {
        const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉";
        console.log(
          `${medal} #${entry.rank.toString().padEnd(2)} ${entry.name.padEnd(20)} ${pc.green(entry.referrals + " referrals")}`,
        );
      });
      console.log();
      return ExitCode.Success;
    }

    logger.error(`Unknown referral subcommand: ${subcommand}`);
    return ExitCode.Failure;
  } catch (error) {
    logger.error(`Referral error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.Failure;
  }
}

/** Experiment subcommand — A/B testing (2026: experiment-driven growth) */
async function experimentCommand(
  subcommand: string,
  options: Record<string, unknown>,
): Promise<number> {
  try {
    if (subcommand === "list") {
      logger.info("Fetching active experiments...");

      const experiments = await growthFetch<ExperimentResult[]>("/experiment");

      if (experiments.length === 0) {
        console.log(pc.gray("\nNo active experiments."));
        return ExitCode.Success;
      }

      console.log("\n" + pc.bold(pc.cyan("  Active Experiments\n")));
      experiments.forEach((exp) => {
        const status = exp.status === "running" ? pc.yellow("●") : pc.green("✓");
        console.log(
          `${status} ${exp.name.padEnd(25)} ${pc.gray(exp.metric)} [${exp.variants.join(", ")}]`,
        );
      });
      console.log();
      return ExitCode.Success;
    }

    if (subcommand === "create") {
      const name = options.name as string;
      const variants = (options.variants as string)?.split(",");
      const metric = options.metric as string;

      if (!name || !variants || !metric) {
        logger.error("Required: --name <name> --variants <A,B> --metric <metric>");
        return ExitCode.Failure;
      }

      logger.info(`Creating experiment: ${name}`);

      const result = await growthFetch<ExperimentResult>("/experiment", {
        method: "POST",
        body: { name, variants, metric },
      });

      console.log(pc.green(`✓ Experiment created: ${result.id}`));
      console.log();
      return ExitCode.Success;
    }

    if (subcommand === "results") {
      const id = options.id as string;
      if (!id) {
        logger.error("--id is required");
        return ExitCode.Failure;
      }

      logger.info(`Fetching results for experiment ${id}...`);

      const result = await growthFetch<ExperimentResult>(`/experiment/${id}`);

      console.log("\n" + pc.bold(pc.cyan(`  Experiment: ${result.name}\n`)));
      console.log(`Metric:       ${result.metric}`);
      console.log(
        `Status:       ${result.status === "running" ? pc.yellow("Running") : pc.green("Concluded")}`,
      );
      if (result.winner) {
        console.log(`Winner:       ${pc.green(result.winner)}`);
      }
      if (result.significance) {
        console.log(`Significance: ${formatPercent(result.significance, 0.95)}`);
      }
      console.log();
      return ExitCode.Success;
    }

    if (subcommand === "conclude") {
      const id = options.id as string;
      const winner = options.winner as string;

      if (!id || !winner) {
        logger.error("Required: --id <id> --winner <variant>");
        return ExitCode.Failure;
      }

      if (!options.yes) {
        logger.warn("Use --yes to confirm experiment conclusion");
        return ExitCode.Failure;
      }

      logger.info(`Concluding experiment ${id} with winner: ${winner}`);

      await growthFetch(`/experiment/${id}`, {
        method: "POST",
        body: { action: "conclude", winner },
      });

      console.log(pc.green(`✓ Experiment concluded. Winner: ${winner}`));
      console.log();
      return ExitCode.Success;
    }

    logger.error(`Unknown experiment subcommand: ${subcommand}`);
    return ExitCode.Failure;
  } catch (error) {
    logger.error(`Experiment error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.Failure;
  }
}

/** Pulse subcommand — AI-generated growth insights (AI-native differentiator) */
async function pulseCommand(options: Record<string, unknown>): Promise<number> {
  try {
    const focus = (options.focus as string) || "activation";
    const depth = (options.depth as string) || "quick";

    logger.info(`Generating growth insights (focus: ${focus}, depth: ${depth})...`);

    const insight = await growthFetch<GrowthInsight>("/pulse", {
      query: { focus, depth },
    });

    console.log("\n" + pc.bold(pc.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")));
    console.log(
      pc.bold(pc.cyan("  AI Growth Insights")) +
        pc.gray(` (${insight.focus}, confidence: ${(insight.confidence * 100).toFixed(0)}%)`),
    );
    console.log(pc.bold(pc.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")) + "\n");

    console.log(pc.bold("Insights:"));
    insight.insights.forEach((i) => {
      console.log(`  • ${i}`);
    });

    console.log("\n" + pc.bold("Recommendations:"));
    insight.recommendations.forEach((r) => {
      console.log(`  ▸ ${r}`);
    });

    console.log();
    return ExitCode.Success;
  } catch (error) {
    logger.error(`Pulse error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.Failure;
  }
}

/**
 * Register the growth command and all subcommands
 */
export function registerGrowthCommand(program: Command): void {
  const growth = program
    .command("growth")
    .description("Growth engine operations — metrics, funnel, cohorts, AI insights");

  // growth dashboard
  growth
    .command("dashboard")
    .description("Growth metrics overview")
    .option("--period <7d|30d|90d>", "Time period", "7d")
    .option("--compare", "Show period-over-period deltas")
    .action(async (options) => {
      process.exit(await dashboardCommand(options));
    });

  // growth funnel
  growth
    .command("funnel")
    .description("Conversion funnel analysis")
    .option("--period <7d|30d|90d>", "Time period", "7d")
    .option("--segment <organic|paid|referral>", "Traffic segment", "all")
    .action(async (options) => {
      process.exit(await funnelCommand(options));
    });

  // growth cohort
  growth
    .command("cohort")
    .description("Cohort retention analysis")
    .option("--period <weekly|monthly>", "Cohort period", "weekly")
    .option("--cohorts <n>", "Number of cohorts", "8")
    .action(async (options) => {
      process.exit(await cohortCommand(options));
    });

  // growth newsletter [stats|subscribers|send]
  const newsletter = growth.command("newsletter <subcommand>").description("Newsletter management");

  newsletter.action(async (subcommand, options) => {
    process.exit(await newsletterCommand(subcommand, options));
  });

  // growth referral [status|config|leaderboard]
  const referral = growth
    .command("referral <subcommand>")
    .description("Referral program management");

  referral.action(async (subcommand, options) => {
    process.exit(await referralCommand(subcommand, options));
  });

  // growth experiment [list|create|results|conclude]
  const experiment = growth
    .command("experiment <subcommand>")
    .description("A/B testing and experiment management");

  experiment
    .option("--id <id>", "Experiment ID")
    .option("--name <name>", "Experiment name")
    .option("--variants <A,B>", "Comma-separated variants")
    .option("--metric <metric>", "Success metric")
    .option("--winner <variant>", "Winning variant")
    .action(async (subcommand, options) => {
      process.exit(await experimentCommand(subcommand, options));
    });

  // growth pulse
  growth
    .command("pulse")
    .description(
      "AI-generated growth insights (AARRR: Acquisition, Activation, Retention, Revenue, Referral)",
    )
    .option(
      "--focus <aarrr>",
      "Focus area (acquisition|activation|retention|revenue|referral)",
      "activation",
    )
    .option("--depth <quick|deep>", "Analysis depth", "quick")
    .action(async (options) => {
      process.exit(await pulseCommand(options));
    });

  // Add global options
  growth
    .option("--dry-run", "Preview changes without applying them")
    .option("--format <json|text>", "Output format", "text")
    .option("--yes", "Skip confirmation prompts");
}

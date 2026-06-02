import type { Command } from "commander";
import pc from "picocolors";
import { findMonorepoRoot } from "../utils/delegate";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

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
  total_events_delta: number;
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
  const _root = await findMonorepoRoot();
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

    if (options.format === "json") {
      console.log(JSON.stringify(metrics, null, 2));
      return ExitCode.SUCCESS;
    }

    const maxValue = Math.max(
      metrics.signups,
      metrics.activations,
      metrics.conversions,
      metrics.active_users,
      1,
    );

    console.log(`\n${pc.cyan(`Growth Metrics — ${metrics.period}`)}\n`);
    const rows: Array<[string, number, number]> = [
      ["Signups", metrics.signups, metrics.signups_delta],
      ["Activations", metrics.activations, metrics.activations_delta],
      ["Conversions", metrics.conversions, metrics.conversions_delta],
      ["Active users", metrics.active_users, metrics.active_users_delta],
      ["Total events", metrics.total_events, metrics.total_events_delta],
    ];
    rows.forEach(([label, value, delta]) => {
      const spark = sparkline(value, maxValue);
      const deltaStr = compare ? ` ${formatDelta(delta)}` : "";
      console.log(
        `  ${pc.blue(label.padEnd(14))} ${spark} ${String(value).padStart(10)}${deltaStr}`,
      );
    });
    const revenueStr = `$${metrics.revenue.toLocaleString()}`;
    const revenueDelta = compare ? ` ${formatDelta(metrics.revenue_delta)}` : "";
    console.log(`  ${pc.blue("Revenue".padEnd(14))}   ${revenueStr.padStart(10)}${revenueDelta}`);
    console.log("");
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Dashboard error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.ERROR;
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

    if (options.format === "json") {
      console.log(JSON.stringify(funnel, null, 2));
      return ExitCode.SUCCESS;
    }

    console.log(`\n${pc.cyan(`Conversion Funnel — ${period} (${segment})`)}\n`);
    funnel.forEach((step, idx) => {
      const filled = Math.ceil(step.rate * 20);
      const bars = "█".repeat(filled);
      const empty = "░".repeat(Math.max(0, 20 - filled));
      const dropoff =
        idx < funnel.length - 1 ? pc.red(`  ↓ ${(step.dropoff_rate * 100).toFixed(1)}% drop`) : "";
      console.log(
        `  ${pc.blue(step.name.padEnd(18))} ${bars}${empty} ${formatPercent(step.rate)} ${String(
          step.count,
        ).padStart(8)}${dropoff}`,
      );
    });

    // Suggestion for highest dropoff
    const maxDropoff = funnel.reduce((max, step) =>
      step.dropoff_rate > max.dropoff_rate ? step : max,
    );
    if (maxDropoff.dropoff_rate > 0.2) {
      console.log(
        `\n${pc.yellow("⚠")} Largest drop-off at ${pc.blue(maxDropoff.name)} — ${pc.red(
          `${(maxDropoff.dropoff_rate * 100).toFixed(1)}%`,
        )}. Consider optimizing this step.`,
      );
    }
    console.log("");
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Funnel error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.ERROR;
  }
}

/** Cohort subcommand — Cohort retention analysis */
async function cohortCommand(options: Record<string, unknown>): Promise<number> {
  try {
    const period = (options.period as string) || "weekly";
    const cohortsCount = parseInt(options.cohorts as string, 10) || 8;

    logger.info(`Fetching ${period} cohort data (${cohortsCount} cohorts)...`);

    const cohorts = await growthFetch<CohortRow[]>("/cohort", {
      query: { period, cohorts: String(cohortsCount) },
    });

    if (cohorts.length === 0) {
      logger.info("No cohort data available.");
      return ExitCode.SUCCESS;
    }

    if (options.format === "json") {
      console.log(JSON.stringify(cohorts, null, 2));
      return ExitCode.SUCCESS;
    }

    // Print header
    const headers = Object.keys(cohorts[0]).slice(1);

    console.log(`\n${pc.cyan(`Cohort Retention — ${period}`)}\n`);
    console.log(
      `  ${pc.dim("Cohort".padEnd(15))}${headers.map((h) => pc.dim(h.padEnd(9))).join("")}`,
    );

    // Print each cohort row with color-coded retention
    cohorts.forEach((row) => {
      const cohortName = String(row.cohort);
      let line = cohortName.padEnd(15);

      headers.forEach((h) => {
        const val = row[h];
        if (typeof val === "number") {
          const retention = val / 100;
          let colored = `${String(Math.round(val))}%`.padEnd(8);

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
      console.log(`  ${line}`);
    });
    console.log("");
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Cohort error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.ERROR;
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

      if (options.format === "json") {
        console.log(JSON.stringify(stats, null, 2));
        return ExitCode.SUCCESS;
      }

      console.log(`\n${pc.cyan("Newsletter Stats")}\n`);
      console.log(`  ${pc.blue("Subscribers".padEnd(16))} ${stats.subscribers.toLocaleString()}`);
      console.log(`  ${pc.blue("Open rate".padEnd(16))} ${formatPercent(stats.open_rate)}`);
      console.log(`  ${pc.blue("Click rate".padEnd(16))} ${formatPercent(stats.click_rate, 0.1)}`);
      console.log(
        `  ${pc.blue("Unsubscribe".padEnd(16))} ${formatPercent(stats.unsubscribe_rate, 0)}`,
      );
      console.log("");
      return ExitCode.SUCCESS;
    }

    if (subcommand === "subscribers") {
      const limit = parseInt(options.limit as string, 10) || 10;
      const offset = parseInt(options.offset as string, 10) || 0;

      logger.info(`Fetching ${limit} newsletter subscribers (offset ${offset})...`);

      const subscribers = await growthFetch<Array<{ email: string; subscribed_at: string }>>(
        "/newsletter/subscribers",
        {
          query: { limit: String(limit), offset: String(offset) },
        },
      );

      if (options.format === "json") {
        console.log(JSON.stringify(subscribers, null, 2));
        return ExitCode.SUCCESS;
      }

      console.log(`\n${pc.cyan(`Newsletter Subscribers`)} (${subscribers.length})\n`);
      subscribers.forEach((sub) => {
        console.log(`  ${pc.blue(sub.email.padEnd(36))} ${pc.dim(sub.subscribed_at)}`);
      });
      console.log("");
      return ExitCode.SUCCESS;
    }

    if (subcommand === "send") {
      const template = options.template as string;
      if (!template) {
        logger.error("--template is required");
        return ExitCode.ERROR;
      }

      if (!options.yes) {
        logger.warn("Use --yes to confirm newsletter send");
        return ExitCode.ERROR;
      }

      logger.info(`Sending newsletter with template: ${template}`);

      await growthFetch("/newsletter/send", {
        method: "POST",
        body: { template_id: template },
      });
      return ExitCode.SUCCESS;
    }

    logger.error(`Unknown newsletter subcommand: ${subcommand}`);
    return ExitCode.ERROR;
  } catch (error) {
    logger.error(`Newsletter error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.ERROR;
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

      if (options.format === "json") {
        console.log(JSON.stringify(referral, null, 2));
        return ExitCode.SUCCESS;
      }

      console.log(`\n${pc.cyan("Referral Program")}\n`);
      console.log(`  ${pc.blue("Invites sent".padEnd(18))} ${referral.invites_sent}`);
      console.log(`  ${pc.blue("Invites converted".padEnd(18))} ${referral.invites_converted}`);
      console.log(
        `  ${pc.blue("Viral coefficient".padEnd(18))} ${referral.viral_coefficient.toFixed(2)}`,
      );
      console.log(
        `  ${pc.blue("Reward".padEnd(18))} ${referral.reward_amount} (${referral.reward_type})`,
      );
      console.log("");
      return ExitCode.SUCCESS;
    }

    if (subcommand === "config") {
      logger.info("Fetching referral config...");

      const config = await growthFetch<Record<string, unknown>>("/referral/config");

      if (options.format === "json") {
        console.log(JSON.stringify(config, null, 2));
        return ExitCode.SUCCESS;
      }

      console.log(`\n${pc.cyan("Referral Config")}\n`);
      Object.entries(config).forEach(([key, value]) => {
        console.log(`  ${pc.blue(key.padEnd(20))} ${String(value)}`);
      });
      console.log("");
      return ExitCode.SUCCESS;
    }

    if (subcommand === "leaderboard") {
      logger.info("Fetching referral leaderboard...");

      const leaderboard =
        await growthFetch<Array<{ rank: number; name: string; referrals: number }>>(
          "/referral/leaderboard",
        );

      if (options.format === "json") {
        console.log(JSON.stringify(leaderboard, null, 2));
        return ExitCode.SUCCESS;
      }

      console.log(`\n${pc.cyan("Referral Leaderboard")}\n`);
      leaderboard.forEach((entry) => {
        const medal =
          entry.rank === 1
            ? "🥇"
            : entry.rank === 2
              ? "🥈"
              : entry.rank === 3
                ? "🥉"
                : `#${entry.rank}`;
        console.log(
          `  ${medal} ${pc.blue(entry.name.padEnd(24))} ${String(entry.referrals).padStart(
            5,
          )} referrals`,
        );
      });
      console.log("");
      return ExitCode.SUCCESS;
    }

    logger.error(`Unknown referral subcommand: ${subcommand}`);
    return ExitCode.ERROR;
  } catch (error) {
    logger.error(`Referral error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.ERROR;
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
        logger.info("No active experiments.");
        return ExitCode.SUCCESS;
      }

      if (options.format === "json") {
        console.log(JSON.stringify(experiments, null, 2));
        return ExitCode.SUCCESS;
      }

      console.log(`\n${pc.cyan("Experiments")} (${experiments.length})\n`);
      experiments.forEach((exp) => {
        const status = exp.status === "running" ? pc.yellow("●") : pc.green("✓");
        const winner = exp.winner ? pc.green(` → winner: ${exp.winner}`) : "";
        console.log(
          `  ${status} ${pc.blue(exp.name.padEnd(28))} ${pc.dim(exp.id)} [${exp.variants.join(
            ", ",
          )}] metric=${exp.metric}${winner}`,
        );
      });
      console.log("");
      return ExitCode.SUCCESS;
    }

    if (subcommand === "create") {
      const name = options.name as string;
      const variants = (options.variants as string)?.split(",");
      const metric = options.metric as string;

      if (!name || !variants || !metric) {
        logger.error("Required: --name <name> --variants <A,B> --metric <metric>");
        return ExitCode.ERROR;
      }

      logger.info(`Creating experiment: ${name}`);

      const _result = await growthFetch<ExperimentResult>("/experiment", {
        method: "POST",
        body: { name, variants, metric },
      });
      return ExitCode.SUCCESS;
    }

    if (subcommand === "results") {
      const id = options.id as string;
      if (!id) {
        logger.error("--id is required");
        return ExitCode.ERROR;
      }

      logger.info(`Fetching results for experiment ${id}...`);

      const result = await growthFetch<ExperimentResult>(`/experiment/${id}`);

      if (options.format === "json") {
        console.log(JSON.stringify(result, null, 2));
        return ExitCode.SUCCESS;
      }

      console.log(`\n${pc.cyan(`Experiment — ${result.name}`)}\n`);
      console.log(`  ${pc.blue("ID".padEnd(14))} ${result.id}`);
      console.log(`  ${pc.blue("Status".padEnd(14))} ${result.status}`);
      console.log(`  ${pc.blue("Variants".padEnd(14))} ${result.variants.join(", ")}`);
      console.log(`  ${pc.blue("Metric".padEnd(14))} ${result.metric}`);
      if (result.winner) {
        console.log(`  ${pc.blue("Winner".padEnd(14))} ${pc.green(result.winner)}`);
      }
      if (result.significance) {
        console.log(
          `  ${pc.blue("Significance".padEnd(14))} ${(result.significance * 100).toFixed(1)}%`,
        );
      }
      console.log("");
      return ExitCode.SUCCESS;
    }

    if (subcommand === "conclude") {
      const id = options.id as string;
      const winner = options.winner as string;

      if (!id || !winner) {
        logger.error("Required: --id <id> --winner <variant>");
        return ExitCode.ERROR;
      }

      if (!options.yes) {
        logger.warn("Use --yes to confirm experiment conclusion");
        return ExitCode.ERROR;
      }

      logger.info(`Concluding experiment ${id} with winner: ${winner}`);

      await growthFetch(`/experiment/${id}`, {
        method: "POST",
        body: { action: "conclude", winner },
      });
      return ExitCode.SUCCESS;
    }

    logger.error(`Unknown experiment subcommand: ${subcommand}`);
    return ExitCode.ERROR;
  } catch (error) {
    logger.error(`Experiment error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.ERROR;
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

    if (options.format === "json") {
      console.log(JSON.stringify(insight, null, 2));
      return ExitCode.SUCCESS;
    }

    console.log(
      `\n${pc.cyan(`Growth Pulse — ${insight.focus}`)} ${pc.dim(
        `(confidence ${(insight.confidence * 100).toFixed(0)}%)`,
      )}\n`,
    );
    console.log(pc.blue("Insights"));
    insight.insights.forEach((i) => {
      console.log(`  • ${i}`);
    });
    console.log(`\n${pc.blue("Recommendations")}`);
    insight.recommendations.forEach((r) => {
      console.log(`  ${pc.green("→")} ${r}`);
    });
    console.log("");
    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Pulse error: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.ERROR;
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

/**
 * POST /api/v1/docs/feedback — public, unauthenticated page/block feedback
 * widget backend.
 *
 * Restores the feedback feature dropped from apps/sailor-docs when it moved
 * to a pure static export (commit dd792c5aa) — the old `src/lib/github.ts`
 * posted through a `"use server"` action, which `output: "export"` cannot
 * build at all. The UI it served (`src/components/feedback/client.tsx`,
 * `schema.ts`) was never deleted; it just lost its server. This gives it a
 * gateway endpoint instead, called client-side over `fetch`.
 *
 * No configuration needed: every submission is stored in Postgres
 * (`DocsFeedback`, `@rls deny` — written only through `getSystemDb()`, never
 * reachable by an app-tenant role) via the repo's own database, so this works
 * out of the box on any deployment. After the insert, sentiment/category/a
 * short summary are filled in best-effort by an async call to the same
 * Router upstream the docs assistant uses (`../ai/gateway.js`'s
 * `defaultEnvUpstreams()` / `fetchUpstreamWithFallback`) — fire-and-forget,
 * never blocking the response, and simply skipped when no Router upstream is
 * configured at all.
 *
 * Posting to GitHub Discussions is now an *optional extra sink*, not the
 * primary store: it only runs when `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY`
 * are set, and a failure there is logged and swallowed rather than failing
 * the request — the feedback is already durably stored by the time it runs.
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { App, type Octokit } from "octokit";
import { env } from "../../config/env.js";
import { createEndpointRateLimit } from "../../middlewares/rateLimit.js";
import { defaultEnvUpstreams, fetchUpstreamWithFallback } from "../ai/gateway.js";
import { docsCors } from "./cors.js";

export const docsFeedbackRoutes = new OpenAPIHono();

docsFeedbackRoutes.use("/feedback", docsCors());
docsFeedbackRoutes.use("/feedback", createEndpointRateLimit(10));

// ── Optional extra sink: GitHub Discussions ─────────────────────────────────

const REPO = "product-Sailor";
const OWNER = "TsekaLuk";
const DOCS_CATEGORY = "Docs Feedback";

let octokitInstance: Octokit | undefined;

async function getOctokit(): Promise<Octokit> {
  if (octokitInstance) return octokitInstance;
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GitHub App not configured");
  }

  const app = new App({ appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY });
  const { data } = await app.octokit.request("GET /repos/{owner}/{repo}/installation", {
    owner: OWNER,
    repo: REPO,
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  });

  octokitInstance = await app.getInstallationOctokit(data.id);
  return octokitInstance;
}

interface RepositoryInfo {
  id: string;
  discussionCategories: { nodes: { id: string; name: string }[] };
}

let cachedDestination: RepositoryInfo | undefined;

async function getFeedbackDestination(): Promise<RepositoryInfo> {
  if (cachedDestination) return cachedDestination;
  const octokit = await getOctokit();
  const { repository }: { repository: RepositoryInfo } = await octokit.graphql(`
    query {
      repository(owner: "${OWNER}", name: "${REPO}") {
        id
        discussionCategories(first: 25) { nodes { id name } }
      }
    }
  `);
  cachedDestination = repository;
  return repository;
}

async function createDiscussionThread(
  pageId: string,
  body: string,
): Promise<{ githubUrl: string }> {
  const octokit = await getOctokit();
  const destination = await getFeedbackDestination();

  const category = destination.discussionCategories.nodes.find((c) => c.name === DOCS_CATEGORY);
  if (!category) {
    throw new Error(`Missing "${DOCS_CATEGORY}" GitHub Discussion category on ${OWNER}/${REPO}`);
  }

  const title = `Feedback for ${pageId}`;
  const {
    search: {
      nodes: [discussion],
    },
  }: { search: { nodes: { id: string; url: string }[] } } = await octokit.graphql(`
    query {
      search(type: DISCUSSION, query: ${JSON.stringify(`${title} in:title repo:${OWNER}/${REPO} author:@me`)}, first: 1) {
        nodes { ... on Discussion { id, url } }
      }
    }
  `);

  if (discussion) {
    const result: { addDiscussionComment: { comment: { id: string; url: string } } } =
      await octokit.graphql(`
        mutation {
          addDiscussionComment(input: { body: ${JSON.stringify(body)}, discussionId: "${discussion.id}" }) {
            comment { id, url }
          }
        }
      `);
    return { githubUrl: result.addDiscussionComment.comment.url };
  }

  const result: { discussion: { id: string; url: string } } = await octokit.graphql(`
    mutation {
      createDiscussion(input: { repositoryId: "${destination.id}", categoryId: "${category.id}", body: ${JSON.stringify(body)}, title: ${JSON.stringify(title)} }) {
        discussion { id, url }
      }
    }
  `);
  return { githubUrl: result.discussion.url };
}

// ── AI triage (best-effort, async, never blocks the response) ──────────────

const SENTIMENT_LABELS = new Set(["positive", "neutral", "negative"]);
const CATEGORY_LABELS = new Set(["bug", "docs-gap", "feature-request", "praise", "other"]);

interface TriageInput {
  url: string;
  message: string;
  blockBody?: string | undefined;
}

interface TriageResult {
  sentimentLabel: string | null;
  sentimentScore: number | null;
  category: string | null;
  summary: string | null;
}

const TRIAGE_PROMPT = [
  "Classify this documentation feedback submission. Respond with ONLY a JSON object,",
  "no prose, no code fence, matching exactly this shape:",
  '{"sentiment":"positive|neutral|negative","score":0.0,"category":"bug|docs-gap|feature-request|praise|other","summary":"<=20 words"}',
].join(" ");

/**
 * Parse the model's reply leniently: models occasionally wrap JSON in a code
 * fence or add a sentence around it despite the prompt, so this pulls the
 * first `{...}` block rather than requiring the whole reply to be valid JSON.
 * Any field that doesn't parse to an expected shape is dropped (null) rather
 * than failing the whole triage — a partial classification is still useful.
 */
function parseTriageReply(text: string): TriageResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const sentiment =
      typeof parsed.sentiment === "string" ? parsed.sentiment.trim().toLowerCase() : null;
    const category =
      typeof parsed.category === "string" ? parsed.category.trim().toLowerCase() : null;
    const score =
      typeof parsed.score === "number" && Number.isFinite(parsed.score) ? parsed.score : null;
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 500) : null;
    return {
      sentimentLabel: sentiment && SENTIMENT_LABELS.has(sentiment) ? sentiment : null,
      sentimentScore: score === null ? null : Math.max(0, Math.min(1, score)),
      category: category && CATEGORY_LABELS.has(category) ? category : null,
      summary: summary || null,
    };
  } catch {
    return null;
  }
}

/**
 * Best-effort AI triage: never awaited by the request handler, and every
 * failure (no upstream configured, upstream error, malformed reply) is
 * logged and swallowed. The feedback row already exists by the time this
 * runs, so there is nothing for a failure here to roll back.
 */
async function triageFeedback(feedbackId: string, input: TriageInput): Promise<void> {
  const upstreams = await defaultEnvUpstreams();
  if (upstreams.length === 0) return;

  const model =
    process.env.DOCS_ASSISTANT_MODEL?.trim() ||
    (upstreams[0]?.id === "nebutra-router" ? DEFAULT_PUBLIC_MODEL : "gpt-4o-mini");

  const userContent = [
    `Page: ${input.url}`,
    input.blockBody ? `Quoted block: ${input.blockBody.slice(0, 1000)}` : null,
    `Feedback: ${input.message}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: TRIAGE_PROMPT },
      { role: "user", content: userContent },
    ],
    stream: false,
    temperature: 0,
  });

  const outcome = await fetchUpstreamWithFallback(
    upstreams,
    (upstream) => ({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${upstream.apiKey}`,
        ...(upstream.headers ?? {}),
      },
      body,
    }),
    {
      onFetchFailed: (event) => {
        logger.warn("docs feedback: triage upstream fetch failed", {
          provider: event.upstream.id,
          error: event.error,
        });
      },
      onUpstreamError: (event) => {
        logger.warn("docs feedback: triage upstream error", {
          provider: event.upstream.id,
          status: event.status,
          error: event.error,
        });
      },
    },
  );

  if (!outcome.ok) {
    logger.warn("docs feedback: triage skipped, every upstream failed", {
      message: outcome.message,
    });
    return;
  }

  const json = (await outcome.response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  } | null;
  const reply = json?.choices?.[0]?.message?.content ?? "";
  const triage = parseTriageReply(reply);
  if (!triage) {
    logger.warn("docs feedback: triage reply did not parse", { replyLength: reply.length });
    return;
  }

  // AUDIT(no-tenant): DocsFeedback is a public-intake table (`@rls deny`),
  // written only through the system client — see the model comment in
  // packages/platform/db/prisma/schema.prisma.
  await getSystemDb().docsFeedback.update({
    where: { id: feedbackId },
    data: {
      sentimentLabel: triage.sentimentLabel,
      sentimentScore: triage.sentimentScore,
      category: triage.category,
      summary: triage.summary,
      triagedAt: new Date(),
    },
  });
}

// ── Schemas — mirror apps/sailor-docs/src/components/feedback/schema.ts ────

const PageFeedbackSchema = z.object({
  kind: z.literal("page"),
  url: z.string(),
  opinion: z.enum(["good", "bad"]),
  message: z.string().max(4000),
});

const BlockFeedbackSchema = z.object({
  kind: z.literal("block"),
  url: z.string(),
  blockId: z.string(),
  blockBody: z.string().optional(),
  message: z.string().max(4000),
});

const FeedbackRequestSchema = z.union([PageFeedbackSchema, BlockFeedbackSchema]);

const FeedbackResponseSchema = z.object({ githubUrl: z.string().optional() });

const feedbackRoute = createRoute({
  method: "post",
  path: "/feedback",
  tags: ["Docs"],
  summary: "Submit page or block feedback",
  description:
    "Public, rate-limited (10/min/IP), unauthenticated. Always stores the submission " +
    "(Postgres, no configuration required) and best-effort AI-triages it asynchronously. " +
    "Also posts to GitHub Discussions when GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY are set.",
  request: {
    body: { content: { "application/json": { schema: FeedbackRequestSchema } } },
  },
  responses: {
    200: {
      description: "Feedback stored",
      content: { "application/json": { schema: FeedbackResponseSchema } },
    },
    502: { description: "Failed to store the submission" },
  },
});

docsFeedbackRoutes.openapi(feedbackRoute, async (c) => {
  const feedback = c.req.valid("json");
  const clientIp =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || null;
  const userAgent = c.req.header("user-agent") ?? null;

  let row: { id: string };
  try {
    // AUDIT(no-tenant): public docs feedback intake — no tenant, `@rls deny`,
    // written only by the gateway's system client.
    row = await getSystemDb().docsFeedback.create({
      data: {
        kind: feedback.kind,
        url: feedback.url,
        opinion: feedback.kind === "page" ? feedback.opinion : null,
        blockId: feedback.kind === "block" ? feedback.blockId : null,
        blockBody: feedback.kind === "block" ? (feedback.blockBody ?? null) : null,
        message: feedback.message,
        ipAddress: clientIp,
        userAgent,
      },
      select: { id: true },
    });
  } catch (error) {
    logger.error("docs feedback: failed to store submission", { error });
    return c.json({ error: "Failed to submit feedback." }, 502) as never;
  }

  void triageFeedback(row.id, {
    url: feedback.url,
    message: feedback.message,
    blockBody: feedback.kind === "block" ? feedback.blockBody : undefined,
  }).catch((error) => {
    logger.warn("docs feedback: triage failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  let githubUrl: string | undefined;
  if (env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY) {
    try {
      const body =
        feedback.kind === "page"
          ? `[${feedback.opinion}] ${feedback.message}\n\n> Forwarded from user feedback.`
          : `> ${feedback.blockBody ?? feedback.blockId}\n\n${feedback.message}\n\n> Forwarded from user feedback.`;
      const result = await createDiscussionThread(feedback.url, body);
      githubUrl = result.githubUrl;
      // AUDIT(no-tenant): same public-intake row as the create() above.
      await getSystemDb()
        .docsFeedback.update({ where: { id: row.id }, data: { githubUrl } })
        .catch(() => {
          /* the GitHub post already succeeded; losing the mirrored url is not worth failing the request over */
        });
    } catch (error) {
      logger.warn("docs feedback: optional GitHub sink failed (feedback was still stored)", {
        error,
      });
    }
  }

  return c.json({ githubUrl }, 200);
});

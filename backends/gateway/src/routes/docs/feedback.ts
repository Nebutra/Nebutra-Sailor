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
 * Answers 503 with a clear message when the GitHub App is not configured
 * (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY unset), so the widget UI can
 * degrade instead of showing a broken form.
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { logger } from "@nebutra/logger";
import { App, type Octokit } from "octokit";
import { env } from "../../config/env.js";
import { createEndpointRateLimit } from "../../middlewares/rateLimit.js";
import { docsCors } from "./cors.js";

export const docsFeedbackRoutes = new OpenAPIHono();

docsFeedbackRoutes.use("/feedback", docsCors());
docsFeedbackRoutes.use("/feedback", createEndpointRateLimit(10));

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
const NotConfiguredSchema = z.object({ error: z.literal("not_configured"), message: z.string() });

const feedbackRoute = createRoute({
  method: "post",
  path: "/feedback",
  tags: ["Docs"],
  summary: "Submit page or block feedback as a GitHub Discussion",
  description: "Public, rate-limited (10/min/IP), unauthenticated.",
  request: {
    body: { content: { "application/json": { schema: FeedbackRequestSchema } } },
  },
  responses: {
    200: {
      description: "Feedback posted",
      content: { "application/json": { schema: FeedbackResponseSchema } },
    },
    503: {
      description: "GitHub App not configured on this deployment",
      content: { "application/json": { schema: NotConfiguredSchema } },
    },
    502: { description: "GitHub API call failed" },
  },
});

docsFeedbackRoutes.openapi(feedbackRoute, async (c) => {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    return c.json(
      {
        error: "not_configured" as const,
        message: "Docs feedback is not configured on this deployment.",
      },
      503,
    );
  }

  const feedback = c.req.valid("json");
  const body =
    feedback.kind === "page"
      ? `[${feedback.opinion}] ${feedback.message}\n\n> Forwarded from user feedback.`
      : `> ${feedback.blockBody ?? feedback.blockId}\n\n${feedback.message}\n\n> Forwarded from user feedback.`;

  try {
    const result = await createDiscussionThread(feedback.url, body);
    return c.json(result, 200);
  } catch (error) {
    logger.error("docs feedback: GitHub call failed", { error });
    return c.json({ error: "Failed to submit feedback to GitHub." }, 502) as never;
  }
});

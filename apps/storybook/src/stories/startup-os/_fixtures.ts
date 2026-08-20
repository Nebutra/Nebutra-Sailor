/**
 * Fixtures for the Startup OS workspace stories.
 *
 * The project and its files come from the real compiler (`compileStartupProject`
 * / `buildStartupProjectFiles`) with a pinned `now`, so the stories show exactly
 * what the product renders rather than hand-written sample data. The
 * conversation state is a fake hook result — the chat panel accepts one, which
 * keeps every story offline.
 */

import { compileStartupProject } from "@nebutra/startup-os/compiler";
import { buildStartupProjectFiles } from "@nebutra/startup-os/files";
import type { UseStartupConversationResult } from "../../../../web/src/components/startup-os/use-startup-conversation";

const PINNED_NOW = "2026-01-05T09:00:00.000Z";

export const STORY_PROJECT = compileStartupProject({
  thesis: "A usage-metered API gateway for AI apps",
  arena: "Developer infrastructure",
  now: PINNED_NOW,
});

export const STORY_SECOND_PROJECT = compileStartupProject({
  thesis: "A support-deflection copilot for B2B SaaS",
  arena: "AI SaaS",
  now: PINNED_NOW,
});

export const STORY_PROJECTS = [STORY_PROJECT, STORY_SECOND_PROJECT] as const;

export const STORY_FILES = buildStartupProjectFiles(STORY_PROJECT);

export const STORY_SELECTED_FILE =
  STORY_FILES.find((file) => file.path === "src/routes/index.tsx") ?? STORY_FILES[0] ?? null;

export const STORY_ARTIFACT = STORY_PROJECT.artifacts[0] ?? null;

export const STORY_RUN = STORY_PROJECT.runs[0] ?? null;

export const STORY_REVIEW_RUN =
  STORY_PROJECT.runs.find((run) => run.approval === "pending_review") ?? STORY_RUN;

function noop() {
  return undefined;
}

/** An idle conversation — the composer is ready, nothing is streaming. */
export const IDLE_CONVERSATION: UseStartupConversationResult = {
  status: "idle",
  isStreaming: false,
  plan: "",
  fileEvents: [],
  artifactEvents: [],
  summary: null,
  error: null,
  startedAt: null,
  durationMs: null,
  turnId: null,
  userPrompt: null,
  send: async () => undefined,
  cancel: noop,
  reset: noop,
};

/** Mid-turn: plan narration is arriving and files are being written. */
export const STREAMING_CONVERSATION: UseStartupConversationResult = {
  ...IDLE_CONVERSATION,
  status: "streaming",
  isStreaming: true,
  plan: "Adding a pricing route, then wiring it into the router and the nav.",
  turnId: "turn_story_1",
  userPrompt: "再加一个定价页",
  startedAt: PINNED_NOW,
};

/** A failed turn — the panel must show the error without losing the composer. */
export const ERROR_CONVERSATION: UseStartupConversationResult = {
  ...IDLE_CONVERSATION,
  status: "error",
  error: "The model provider rejected the request.",
  turnId: "turn_story_2",
  userPrompt: "把 hero 改成品牌渐变",
};

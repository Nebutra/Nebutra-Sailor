/**
 * User context primitives — Memory-as-context layer for AI conversations.
 *
 * Inspired by Perplexity / ChatGPT "custom instructions" pattern but
 * implemented as pure helpers: this package does **not** read the database
 * (keeps `@nebutra/agents` data-layer-agnostic). The caller fetches the
 * profile and passes the structured object in.
 *
 * Usage pattern from a Next.js route:
 *
 * ```ts
 * const profile = await db.userProfile.findUnique({ where: { userId } });
 * const system = buildPersonalizedSystemPrompt(BASE_PROMPT, profile);
 * const result = await streamText(messages, { system, model: "fast" });
 * ```
 */

export interface UserContext {
  /** What the assistant should call the user. */
  nickname?: string | null;
  /** Job title / role — gives the model audience context. */
  occupation?: string | null;
  /** Free-form bio (interests, location, work focus, etc.). */
  bio?: string | null;
  /** Verbatim instructions that override default tone/format. */
  customInstructions?: string | null;
}

const MAX_BIO_CHARS = 2000;
const MAX_INSTRUCTIONS_CHARS = 3000;
const MAX_OCCUPATION_CHARS = 120;
const MAX_NICKNAME_CHARS = 80;

/**
 * Truthy check that treats empty strings as "no context".
 */
function present(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Truncate to a hard byte budget — defensive against runaway DB rows.
 */
function clamp(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Renders a `UserContext` as a compact block to inject into a system prompt.
 *
 * Output is null when no field is set, so callers can skip the entire
 * "About the user" preamble and avoid wasted tokens.
 */
export function renderUserContextBlock(context: UserContext | null | undefined): string | null {
  if (!context) return null;

  const lines: string[] = [];

  if (present(context.nickname)) {
    lines.push(`- Preferred name: ${clamp(context.nickname.trim(), MAX_NICKNAME_CHARS)}`);
  }
  if (present(context.occupation)) {
    lines.push(`- Role: ${clamp(context.occupation.trim(), MAX_OCCUPATION_CHARS)}`);
  }
  if (present(context.bio)) {
    lines.push(`- About them: ${clamp(context.bio.trim(), MAX_BIO_CHARS)}`);
  }

  let block = "";
  if (lines.length > 0) {
    block += `About the user:\n${lines.join("\n")}`;
  }

  if (present(context.customInstructions)) {
    if (block) block += "\n\n";
    block += `The user's custom instructions (these take precedence over defaults):\n${clamp(
      context.customInstructions.trim(),
      MAX_INSTRUCTIONS_CHARS,
    )}`;
  }

  return block.length > 0 ? block : null;
}

/**
 * Builds the final system prompt by prepending a personalization block to the
 * base prompt. Pure — no side effects, safe to call per-request.
 *
 * @param basePrompt - the assistant's role-defining base prompt
 * @param context    - structured user context (null/undefined disables personalization)
 */
export function buildPersonalizedSystemPrompt(
  basePrompt: string,
  context: UserContext | null | undefined,
): string {
  const block = renderUserContextBlock(context);
  if (!block) return basePrompt;
  return `${block}\n\n---\n\n${basePrompt}`;
}

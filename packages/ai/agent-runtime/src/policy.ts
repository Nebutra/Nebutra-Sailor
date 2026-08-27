/**
 * Approval + capability policy (WRAP — capability #8).
 *
 * Faithful re-expression of the upstream two orthogonal axes:
 *   1. Approval policy  — *when* to ask a human (AskForApproval).
 *   2. Capability policy — *what* an external executor is permitted to do
 *      (SandboxPolicy). Policy/semantics only; enforcement is out of scope
 *      and lives behind the external-sandbox seam (see ./sandbox).
 *
 * Plus the static rule decision (execpolicy `Decision`) and the human's rich
 * answer (`ReviewDecision`). Built on `@nebutra/permissions` for *who may
 * approve*; this module models *what tier / what answer*.
 */

import { z } from "zod";

// ── Axis 1: approval policy ──────────────────────────────────────────────────

/** Fine-grained per-category gates. `false` = auto-reject (not auto-ask). */
export const granularApprovalConfigSchema = z.object({
  sandboxApproval: z.boolean(),
  rules: z.boolean(),
  skillApproval: z.boolean().default(false),
  requestPermissions: z.boolean().default(false),
  mcpElicitations: z.boolean(),
});
export type GranularApprovalConfig = z.infer<typeof granularApprovalConfigSchema>;

/**
 * Approval tier.
 *  - `unless_trusted` : only known-safe read-only ops auto-approved; else ask.
 *  - `on_failure`     : DEPRECATED — auto-run sandboxed, escalate on failure.
 *  - `on_request`     : the model decides when to ask (default).
 *  - `granular`       : per-category booleans.
 *  - `never`          : failures returned to the model, never escalated.
 */
export const approvalPolicySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unless_trusted") }),
  z.object({ kind: z.literal("on_failure") }),
  z.object({ kind: z.literal("on_request") }),
  z.object({ kind: z.literal("granular"), config: granularApprovalConfigSchema }),
  z.object({ kind: z.literal("never") }),
]);
export type ApprovalPolicy = z.infer<typeof approvalPolicySchema>;

export const DEFAULT_APPROVAL_POLICY: ApprovalPolicy = { kind: "on_request" };

// ── Axis 2: capability policy ────────────────────────────────────────────────

/** A writable root with read-only sub-paths and escalation-protected names. */
export const writableRootSchema = z.object({
  root: z.string(),
  readOnlySubpaths: z.array(z.string()).default([]),
  /** Names that must never be writable even under this root (e.g. ".git/hooks"). */
  protectedMetadataNames: z.array(z.string()).default([]),
});
export type WritableRoot = z.infer<typeof writableRootSchema>;

/**
 * Capability policy — a vocabulary of *capabilities*, not OS mechanisms.
 * Per the dual-track governance decision, `external_sandbox` is the default
 * posture: this runtime never enforces isolation itself.
 */
export const capabilityPolicySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("danger_full_access") }),
  z.object({ kind: z.literal("read_only"), networkAccess: z.boolean().default(false) }),
  z.object({
    kind: z.literal("external_sandbox"),
    networkAccess: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("workspace_write"),
    writableRoots: z.array(writableRootSchema).default([]),
    networkAccess: z.boolean().default(false),
    excludeTmpdir: z.boolean().default(false),
    excludeSlashTmp: z.boolean().default(false),
  }),
]);
export type CapabilityPolicy = z.infer<typeof capabilityPolicySchema>;

/** Default posture for a multi-tenant web runtime (governance: ExternalSandbox). */
export const DEFAULT_CAPABILITY_POLICY: CapabilityPolicy = {
  kind: "external_sandbox",
  networkAccess: false,
};

// ── Static rule decision (policy-as-data evaluator output) ────────────────────

/** Classification of a command *before* approval. */
export type RuleDecision = "allow" | "prompt" | "forbidden";

// ── The human's answer ───────────────────────────────────────────────────────

/** A session-scoped amendment that remembers an allowed command prefix. */
export interface RuleAmendment {
  readonly allowPrefix: readonly string[];
}

/** Persist allow/deny for future requests to the same host. */
export interface NetworkPolicyAmendment {
  readonly host: string;
  readonly effect: "allow" | "deny";
}

/**
 * The reviewer's rich answer. Mirrors upstream `ReviewDecision`; `denied`
 * is the safe default.
 */
export type ReviewDecision =
  | { readonly kind: "approved" }
  | { readonly kind: "approved_rule_amendment"; readonly amendment: RuleAmendment }
  | { readonly kind: "approved_for_session" }
  | { readonly kind: "network_policy_amendment"; readonly amendment: NetworkPolicyAmendment }
  | { readonly kind: "denied" }
  | { readonly kind: "timed_out" }
  | { readonly kind: "abort" };

export const DENIED: ReviewDecision = { kind: "denied" };

/** Whether a decision permits the action to proceed. */
export function isApproval(decision: ReviewDecision): boolean {
  return (
    decision.kind === "approved" ||
    decision.kind === "approved_rule_amendment" ||
    decision.kind === "approved_for_session"
  );
}

/**
 * Resolve a static rule decision against an approval policy into whether the
 * action proceeds without a human, must be asked, or is auto-rejected.
 * Pure; the actual prompting/escalation transport lives in ./protocol.
 */
export function resolveRuleDecision(
  rule: RuleDecision,
  policy: ApprovalPolicy,
): "auto_allow" | "ask_human" | "auto_reject" {
  if (rule === "forbidden") return "auto_reject";
  if (rule === "allow") return "auto_allow";
  // rule === "prompt"
  switch (policy.kind) {
    case "never":
      return "auto_reject";
    case "unless_trusted":
    case "on_request":
    case "on_failure":
      return "ask_human";
    case "granular":
      return policy.config.rules ? "ask_human" : "auto_reject";
  }
}

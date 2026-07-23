import type { z } from "zod";

export type ToolTier = "core" | "catalog" | "job";
export type SideEffectClass = "pure" | "read" | "write" | "external";
export type ToolRuntime = "client" | "server";
/**
 * **Internal** craftsmanship gate — NOT a user-facing product label.
 * See docs/plans/2026-07-23-nebutra-sota-quality-playbook.md
 * Do not render this on customer UI (cards, marketing, badges).
 * - scaffold: works, playbook not yet passed
 * - lab: real engine, human UX incomplete
 * - production: playbook gates passed for shipping confidence
 */
export type SotaStatus = "scaffold" | "lab" | "production";

export interface LocalizedString {
  readonly zh: string;
  readonly en: string;
}

export interface ToolEngineMeta {
  readonly name: string;
  readonly upstream: string;
  readonly version: string;
}

export interface ForgeToolDefinition<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly slug: string;
  readonly category: string;
  readonly title: LocalizedString;
  readonly description: LocalizedString;
  readonly tier: ToolTier;
  readonly sideEffect: SideEffectClass;
  readonly runtime: readonly ToolRuntime[];
  readonly meterId: string;
  readonly engine: ToolEngineMeta;
  readonly seoKeywords: LocalizedString;
  readonly inputSchema: z.ZodType<TInput>;
  readonly execute: (input: TInput) => TOutput | Promise<TOutput>;
  /** Optional free-tier unit cost in wallet currency (0 = free). */
  readonly unitCost?: number;
  /** Internal only; defaults to scaffold until playbook gates pass. */
  readonly sotaStatus?: SotaStatus;
}

/**
 * Heterogeneous registry entry. Uses `any` on purpose so concrete tools
 * with distinct input schemas can live in one list (validated at invoke time).
 */
// biome-ignore lint/suspicious/noExplicitAny: registry type erasure
export type AnyForgeToolDefinition = ForgeToolDefinition<any, any>;

export interface ForgeToolSummary {
  readonly id: string;
  readonly slug: string;
  readonly category: string;
  readonly title: LocalizedString;
  readonly description: LocalizedString;
  readonly tier: ToolTier;
  readonly sideEffect: SideEffectClass;
  readonly meterId: string;
  readonly engine: ToolEngineMeta;
  readonly path: string;
  readonly sotaStatus: SotaStatus;
}

export interface InvokeRequest {
  readonly toolId: string;
  readonly input: unknown;
  readonly requestId?: string;
  readonly tenantId?: string;
}

export interface InvokeSuccess<T = unknown> {
  readonly ok: true;
  readonly requestId: string;
  readonly toolId: string;
  readonly output: T;
  readonly meterId: string;
  readonly unitCost: number;
  readonly durationMs: number;
}

export interface InvokeFailure {
  readonly ok: false;
  readonly requestId: string;
  readonly toolId: string;
  readonly code: string;
  readonly message: string;
  readonly durationMs: number;
}

export type InvokeResult<T = unknown> = InvokeSuccess<T> | InvokeFailure;

export interface ToolPageModel {
  readonly id: string;
  readonly slug: string;
  readonly category: string;
  readonly path: string;
  readonly title: LocalizedString;
  readonly description: LocalizedString;
  readonly tier: ToolTier;
  readonly engine: ToolEngineMeta;
  readonly meterId: string;
  readonly sideEffect: SideEffectClass;
  readonly sotaStatus: SotaStatus;
  readonly seo: {
    readonly title: LocalizedString;
    readonly keywords: LocalizedString;
  };
  readonly api: {
    readonly method: "POST";
    readonly path: string;
    readonly exampleCurl: string;
  };
  readonly related: readonly ForgeToolSummary[];
}

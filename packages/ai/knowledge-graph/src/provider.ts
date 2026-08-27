/**
 * The `getX()` provider seam — mirrors @nebutra/code-index / @nebutra/search.
 *
 * Concrete GraphStore / FactStore / VectorRetriever / EntityResolver / Clock
 * adapters are HOST-INJECTED, never bundled and never vendor-auto-detected
 * (this package has no DB/vendor it could honestly auto-detect). The runtime
 * is the validated, scope-bound bundle of those ports; the feature modules
 * (`link-extraction`, `temporal-facts`, `consolidate`, `hybrid-fusion`) are
 * pure logic that take this runtime as a parameter — provider.ts deliberately
 * does NOT import them, keeping the seam decoupled from module internals.
 *
 * Fail-closed: {@link getKnowledgeGraph} throws
 * {@link KnowledgeGraphNotConfiguredError} until the host configures it — the
 * honest default when no backend is present.
 */

import {
  type Clock,
  type EntityResolver,
  type FactStore,
  type GraphStore,
  KnowledgeGraphNotConfiguredError,
  type SourceScope,
  type SourceScopeInput,
  sourceScope,
  type VectorRetriever,
} from "./interfaces";

/** The scope-bound bundle of injected ports the feature modules operate over. */
export interface KnowledgeGraphRuntime {
  readonly scope: SourceScope;
  readonly graph: GraphStore;
  readonly facts: FactStore;
  readonly vector: VectorRetriever;
  readonly resolver: EntityResolver;
  readonly clock: Clock;
}

export interface KnowledgeGraphConfig {
  readonly scope: SourceScopeInput;
  readonly graph: GraphStore;
  readonly facts: FactStore;
  readonly vector: VectorRetriever;
  readonly resolver: EntityResolver;
  /** Defaults to a real wall clock; inject a fixed clock in tests. */
  readonly clock?: Clock;
}

let singleton: KnowledgeGraphRuntime | null = null;

/** Build a runtime. The scope is Zod-validated and fails closed on empty. */
export function createKnowledgeGraph(config: KnowledgeGraphConfig): KnowledgeGraphRuntime {
  return {
    scope: sourceScope(config.scope),
    graph: config.graph,
    facts: config.facts,
    vector: config.vector,
    resolver: config.resolver,
    clock: config.clock ?? { now: () => new Date() },
  };
}

/** Configure (and replace) the process-default runtime. */
export function configureKnowledgeGraph(config: KnowledgeGraphConfig): KnowledgeGraphRuntime {
  singleton = createKnowledgeGraph(config);
  return singleton;
}

/** Get the default runtime, or fail closed if never configured. */
export function getKnowledgeGraph(): KnowledgeGraphRuntime {
  if (!singleton) {
    throw new KnowledgeGraphNotConfiguredError(
      "knowledge-graph runtime not configured — host must inject GraphStore/FactStore/VectorRetriever/EntityResolver before use",
    );
  }
  return singleton;
}

/** Test seam: install a runtime directly. */
export function setKnowledgeGraph(runtime: KnowledgeGraphRuntime): void {
  singleton = runtime;
}

/** Clear the default runtime. */
export function closeKnowledgeGraph(): void {
  singleton = null;
}

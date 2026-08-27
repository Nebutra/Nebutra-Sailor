// Loose alias used inside builders — Better Auth's `auth.api` is a record of
// dynamically generated endpoint handlers; the precise types vary per plugin
// and are bridged at runtime.
export type BetterAuthApi = Record<string, ((...args: unknown[]) => Promise<unknown>) | undefined>;

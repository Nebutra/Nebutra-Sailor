// `server-only` throws the moment it is imported anywhere but a React Server
// Component, which makes every module that guards itself with it untestable
// under vitest. Aliased to this empty module in vitest.config.ts — the same
// shape apps/web uses. The guard still holds in the real app; only the test
// runner is exempt.
export {};

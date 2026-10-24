/**
 * Next.js boot hook. In the Node runtime: apply STATUS_CONFIG_FILE and start
 * the monitor runner (unless STATUS_RUNNER=off). Edge never runs either.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ getDb }, { boot, bootConfigProblems }, { log }] = await Promise.all([
    import("./server/db"),
    import("./server/runner"),
    import("./server/log"),
  ]);
  // Fail fast: a misconfigured instance should not come up half-working.
  // `next build` runs with NODE_ENV=production but never calls register().
  const problems = bootConfigProblems();
  if (problems.length > 0) {
    for (const problem of problems) log.error("refusing to start", { reason: problem });
    process.exit(1);
  }
  if (!process.env.STATUS_DATABASE_URL) return;
  await boot(getDb());
}

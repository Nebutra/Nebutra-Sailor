/**
 * Next.js boot hook. In the Node runtime: apply STATUS_CONFIG_FILE and start
 * the monitor runner (unless STATUS_RUNNER=off). Edge never runs either.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.STATUS_DATABASE_URL) return;
  const [{ getDb }, { boot }] = await Promise.all([
    import("./server/db"),
    import("./server/runner"),
  ]);
  await boot(getDb());
}

const ROUTE_PREWARM_ATTEMPTS = 3;
const ROUTE_PREWARM_RETRY_DELAY_MS = 2_000;
const ROUTE_PREWARM_TIMEOUT_MS = 60_000;
const OPTIONAL_ROUTE_PREWARM_TIMEOUT_MS = 20_000;
const PREWARM_ROUTES = [
  { path: "/api/e2e/health", required: true, timeoutMs: ROUTE_PREWARM_TIMEOUT_MS },
  { path: "/changelog", required: false, timeoutMs: OPTIONAL_ROUTE_PREWARM_TIMEOUT_MS },
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function describeError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

async function fetchWithTimeout(url: URL, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status >= 500) {
      throw new Error(`Prewarm failed for ${url.toString()} with HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function prewarmRoute(url: URL, route: (typeof PREWARM_ROUTES)[number]) {
  for (let attempt = 1; attempt <= ROUTE_PREWARM_ATTEMPTS; attempt += 1) {
    try {
      await fetchWithTimeout(url, route.timeoutMs);
      return;
    } catch (error) {
      const detail = describeError(error);
      if (attempt === ROUTE_PREWARM_ATTEMPTS) {
        if (!route.required) {
          process.stdout.write(
            `[e2e-global-setup] optional prewarm skipped ${url.toString()}: ${detail}\n`,
          );
          return;
        }

        throw new Error(`Prewarm failed for ${url.toString()}: ${detail}`);
      }

      process.stdout.write(
        `[e2e-global-setup] prewarm retry ${attempt}/${ROUTE_PREWARM_ATTEMPTS} ${url.toString()}: ${detail}\n`,
      );
      await sleep(ROUTE_PREWARM_RETRY_DELAY_MS);
    }
  }
}

export default async function globalSetup() {
  const baseUrl = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100");

  for (const route of PREWARM_ROUTES) {
    const url = new URL(route.path, baseUrl);
    process.stdout.write(`[e2e-global-setup] prewarm ${url.toString()}\n`);
    await prewarmRoute(url, route);
  }
}

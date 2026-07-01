const ROUTE_PREWARM_ATTEMPTS = 3;
const ROUTE_PREWARM_RETRY_DELAY_MS = 2_000;
const ROUTE_PREWARM_TIMEOUT_MS = 60_000;
const PREWARM_ROUTES = ["/api/e2e/health"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function describeError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

async function fetchWithTimeout(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTE_PREWARM_TIMEOUT_MS);

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

async function prewarmRoute(url: URL) {
  for (let attempt = 1; attempt <= ROUTE_PREWARM_ATTEMPTS; attempt += 1) {
    try {
      await fetchWithTimeout(url);
      return;
    } catch (error) {
      const detail = describeError(error);
      if (attempt === ROUTE_PREWARM_ATTEMPTS) {
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
    const url = new URL(route, baseUrl);
    process.stdout.write(`[e2e-global-setup] prewarm ${url.toString()}\n`);
    await prewarmRoute(url);
  }
}

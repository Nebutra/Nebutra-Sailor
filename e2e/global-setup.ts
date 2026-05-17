const ROUTE_PREWARM_TIMEOUT_MS = 90_000;
const PREWARM_ROUTES = ["/", "/changelog"];

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

export default async function globalSetup() {
  const baseUrl = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100");

  for (const route of PREWARM_ROUTES) {
    const url = new URL(route, baseUrl);
    process.stdout.write(`[e2e-global-setup] prewarm ${url.toString()}\n`);
    await fetchWithTimeout(url);
  }
}

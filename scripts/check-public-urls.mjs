#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 3;

const endpoints = [
  {
    id: "landing",
    url: "https://nebutra.com",
    okStatuses: [200],
  },
  {
    id: "landing-refer",
    url: "https://nebutra.com/refer?code=smoke",
    okStatuses: [200],
  },
  {
    id: "app",
    url: "https://app.nebutra.com",
    okStatuses: [200],
  },
  {
    id: "api-health",
    url: "https://api.nebutra.com/api/misc/health",
    okStatuses: [200],
    validate: async (response) => {
      const payload = await response.json();
      const database = payload?.database ?? payload?.dependencies?.database;
      if (database?.status !== "up") {
        return `expected database.status=up, got ${JSON.stringify(database)}`;
      }
      return null;
    },
  },
  {
    id: "api-auth-session",
    url: "https://api.nebutra.com/api/auth/session",
    okStatuses: [200],
  },
  {
    id: "design-docs",
    url: "https://design.nebutra.com",
    okStatuses: [200],
  },
  {
    // Host alias on Vercel landing — must stay on status.nebutra.com (not 301 to apex).
    id: "status",
    url: "https://status.nebutra.com",
    okStatuses: [200],
  },
  {
    id: "status-json",
    url: "https://status.nebutra.com/status.json",
    okStatuses: [200],
  },
  {
    id: "sailor-docs",
    url: "https://docs.nebutra.com",
    okStatuses: [200],
  },
  {
    id: "studio-sanity-host",
    url: "https://nebutra.sanity.studio",
    okStatuses: [200],
    // Sanity's own hosting bounces an unauthenticated visit to its login flow.
    allowFinalHosts: ["www.sanity.io"],
  },
  {
    id: "landing-www-alias",
    url: "https://www.nebutra.com",
    okStatuses: [200, 301, 302, 307, 308],
    alias: true,
  },
  {
    id: "landing-www-refer-alias",
    url: "https://www.nebutra.com/refer?code=smoke",
    okStatuses: [200, 301, 302, 307, 308],
    alias: true,
  },
  {
    id: "studio-branded-alias",
    url: "https://studio.nebutra.com",
    okStatuses: [200, 301, 302, 307, 308],
    alias: true,
  },
];

function parseArgs(argv) {
  const options = {
    includeAliases: false,
    json: false,
    retries: DEFAULT_RETRIES,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--include-aliases") {
      options.includeAliases = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--retries") {
      options.retries = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--timeout-ms") {
      options.timeoutMs = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.retries) || options.retries < 1) {
    throw new Error("--retries must be a positive integer");
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1000) {
    throw new Error("--timeout-ms must be an integer >= 1000");
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/check-public-urls.mjs [options]

Options:
  --include-aliases   Also check DNS/custom-domain aliases such as www and studio.nebutra.com.
  --json              Emit JSON instead of human-readable lines.
  --retries <n>       Attempts per endpoint. Default: ${DEFAULT_RETRIES}.
  --timeout-ms <n>    Timeout per request. Default: ${DEFAULT_TIMEOUT_MS}.
`);
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function discardResponseBody(response) {
  if (!response.body) {
    return;
  }
  await response.body.cancel().catch(() => {});
}

async function checkEndpoint(endpoint, options) {
  let lastError = null;

  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(endpoint.url, options.timeoutMs);
      const result = {
        id: endpoint.id,
        url: endpoint.url,
        finalUrl: response.url,
        status: response.status,
        attempt,
        ok: endpoint.okStatuses.includes(response.status),
      };

      // Where the request ended up, not just what it ended up returning.
      //
      // Redirects are followed, so a host that nothing serves still reports 200:
      // nginx has no server_name for it, the request falls through to the first
      // 443 block, and its `301 → https://nebutra.com$request_uri` hands back
      // the marketing home page. That is exactly how design.nebutra.com passed
      // this check while the design system was unreachable — the whole point of
      // the check being that someone would notice.
      const expectedHost = new URL(endpoint.url).host;
      const finalHost = new URL(response.url).host;
      // `alias: true` means the endpoint exists in order to redirect somewhere
      // else (www → apex, studio.nebutra.com → Sanity), so landing off-host is
      // the passing case for those.
      const hostAllowed =
        endpoint.alias === true ||
        finalHost === expectedHost ||
        (endpoint.allowFinalHosts ?? []).includes(finalHost);

      if (!result.ok) {
        await discardResponseBody(response);
        lastError = `expected ${endpoint.okStatuses.join("/")}, got ${response.status}`;
      } else if (!hostAllowed) {
        await discardResponseBody(response);
        result.ok = false;
        lastError = `redirected off ${expectedHost} to ${finalHost} — nothing appears to serve this host`;
      } else if (endpoint.validate) {
        const validationError = await endpoint.validate(response);
        if (validationError) {
          result.ok = false;
          lastError = validationError;
        } else {
          return result;
        }
      } else {
        await discardResponseBody(response);
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    if (attempt < options.retries) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return {
    id: endpoint.id,
    url: endpoint.url,
    status: 0,
    ok: false,
    error: lastError,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const selectedEndpoints = endpoints.filter(
    (endpoint) => options.includeAliases || !endpoint.alias,
  );
  const results = [];

  for (const endpoint of selectedEndpoints) {
    const result = await checkEndpoint(endpoint, options);
    results.push(result);
    if (!options.json) {
      if (result.ok) {
        console.log(`ok ${result.id} ${result.url} -> ${result.status} ${result.finalUrl}`);
      } else {
        console.log(`fail ${result.id} ${result.url} -> ${result.error ?? result.status}`);
      }
    }
  }

  if (options.json) {
    console.log(JSON.stringify({ ok: results.every((result) => result.ok), results }, null, 2));
  }

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

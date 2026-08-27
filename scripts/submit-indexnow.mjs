#!/usr/bin/env node
/**
 * submit-indexnow.mjs
 *
 * Push a host's sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver).
 *
 * IndexNow is the only submission channel that needs no console account: the
 * host proves ownership by serving the key back from `keyLocation`. Google does
 * not participate — it discovers through links and Search Console.
 *
 * Usage:
 *   INDEXNOW_KEY=<key> node scripts/submit-indexnow.mjs [--host forge.nebutra.com] [--dry-run]
 *
 * Exit codes:
 *   0  submitted (or dry run)
 *   1  key missing, key file unverifiable, or the endpoint rejected the batch
 */

const args = new Set(process.argv.slice(2));
const argValue = (flag, fallback) => {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const HOST = argValue("--host", "forge.nebutra.com");
const DRY_RUN = args.has("--dry-run");
const KEY = process.env.INDEXNOW_KEY?.trim();
const ORIGIN = `https://${HOST}`;
const KEY_LOCATION = `${ORIGIN}/indexnow-key.txt`;
// IndexNow shares submissions between participating engines, but Yandex only
// honours its own endpoint reliably, so both are pinged.
const ENDPOINTS = ["https://api.indexnow.org/indexnow", "https://yandex.com/indexnow"];
const BATCH_SIZE = 10_000;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function fetchSitemapUrls() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`, {
    headers: { "User-Agent": "nebutra-indexnow-submitter" },
  });
  if (!res.ok) fail(`sitemap.xml returned HTTP ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urls.length === 0) fail("sitemap.xml contained no <loc> entries");
  return urls;
}

/** The engines fetch this themselves; a 404 here means every submission is discarded. */
async function verifyKeyFile() {
  const res = await fetch(KEY_LOCATION, {
    headers: { "User-Agent": "nebutra-indexnow-submitter" },
  });
  if (!res.ok) fail(`${KEY_LOCATION} returned HTTP ${res.status} — deploy the key route first`);
  const body = (await res.text()).trim();
  if (body !== KEY) {
    fail(
      `${KEY_LOCATION} served "${body.slice(0, 16)}…" but INDEXNOW_KEY is "${KEY.slice(0, 16)}…"`,
    );
  }
  console.log(`✓ key file verified at ${KEY_LOCATION}`);
}

async function submit(endpoint, urlList) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });
  const detail = await res.text().catch(() => "");
  // 200 = accepted, 202 = accepted pending key validation. Both are successes.
  const ok = res.status === 200 || res.status === 202;
  console.log(
    `${ok ? "✓" : "✗"} ${endpoint} → HTTP ${res.status}${detail ? ` ${detail.slice(0, 120)}` : ""}`,
  );
  return ok;
}

async function main() {
  if (!KEY) fail("INDEXNOW_KEY is not set");

  const urls = await fetchSitemapUrls();
  console.log(`sitemap: ${urls.length} URLs from ${ORIGIN}/sitemap.xml`);

  if (DRY_RUN) {
    console.log(`dry run — would submit ${urls.length} URLs with keyLocation ${KEY_LOCATION}`);
    for (const url of urls.slice(0, 5)) console.log(`  ${url}`);
    if (urls.length > 5) console.log(`  … ${urls.length - 5} more`);
    return;
  }

  await verifyKeyFile();

  let allOk = true;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    for (const endpoint of ENDPOINTS) {
      // One endpoint refusing must not hide a success at the other.
      allOk = (await submit(endpoint, batch)) && allOk;
    }
  }

  if (!allOk) fail("at least one endpoint rejected the batch");
  console.log(`\n✓ submitted ${urls.length} URLs for ${HOST}`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));

/**
 * A deployed page must never point a visitor at their own machine.
 *
 * the template demo site shipped "Sign in" -> http://localhost:3001/sign-in because a
 * public URL env var was missing at build time and a dev default filled in.
 * This is the net under the env schemas: look at what was actually rendered.
 * It scans the raw HTML (links, inline scripts, the RSC payload), not only the
 * visible text, because a baked-in origin hides in all three.
 */

const LOCAL_ORIGIN =
  /\bhttps?:(?:\/\/|\\u002F\\u002F|\\\/\\\/)(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?/gi;

/**
 * Text that *shows* a local URL on purpose — a recorded terminal printing
 * `npm dev → http://localhost:3000` — is not a link to the visitor's machine.
 * Such an element opts out with `data-localhost-sample`; only its text is
 * skipped. Its attributes are still scanned, so an href pointing at
 * localhost on that same element is still caught.
 */
const LOCALHOST_SAMPLE =
  /(<([a-z][\w-]*)\b[^>]*\sdata-localhost-sample(?:=""|="true")?[^>]*>)[^<]*(<\/\2>)/gi;

/** @returns {string[]} the distinct local origins found in `html`, with a little context. */
export function findLocalhostUrls(html) {
  const found = new Set();
  const scanned = html.replace(LOCALHOST_SAMPLE, "$1$3");
  for (const match of scanned.matchAll(LOCAL_ORIGIN)) {
    const start = Math.max(0, match.index - 40);
    found.add(scanned.slice(start, match.index + match[0].length + 30).replace(/\s+/g, " "));
    if (found.size >= 5) break;
  }
  return [...found];
}

/**
 * Fetch each path of a deployed site and fail on any local origin.
 * @returns {Promise<string[]>} one message per offending page
 */
export async function checkSiteForLocalhost(
  baseUrl,
  paths,
  { userAgent = "nebutra-localhost-check/1.0" } = {},
) {
  const problems = [];
  for (const p of paths) {
    const url = new URL(p, baseUrl).toString();
    const res = await fetch(url, {
      headers: { "user-agent": userAgent, accept: "text/html" },
      redirect: "follow",
    });
    if (res.status !== 200) {
      problems.push(`${url} -> HTTP ${res.status}`);
      continue;
    }
    const hits = findLocalhostUrls(await res.text());
    if (hits.length > 0)
      problems.push(`${url} renders a localhost URL:\n    ${hits.join("\n    ")}`);
  }
  return problems;
}

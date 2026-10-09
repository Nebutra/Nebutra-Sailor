/**
 * Refresh the community section's build input from the canonical repository on GitHub: weekly
 * commit totals for the last 52 weeks, the published releases and the star count, with the time
 * they were read. The page states that time; nothing is extrapolated. Run by hand (uses the `gh`
 * CLI for authentication); the file is committed.
 *
 *   node apps/kcq/scripts/refresh-community.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pin = JSON.parse(readFileSync(new URL("../chart-source.json", import.meta.url), "utf8"));
const repo = new URL(pin.upstreamRepository).pathname.replace(/^\/|\.git$/g, "");
const api = (path) => JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8" }));

/** GitHub computes commit stats lazily: the first calls return 202 with an empty body. */
const ready = (value) => Array.isArray(value) && value.length > 0;
let activity = api(`repos/${repo}/stats/commit_activity`);
for (let attempt = 0; attempt < 6 && !ready(activity); attempt++) {
  execFileSync("sleep", ["5"]);
  activity = api(`repos/${repo}/stats/commit_activity`);
}
if (!Array.isArray(activity) || activity.length !== 52)
  throw new Error("commit activity unavailable");
const count = (value) => {
  if (!Number.isInteger(value) || value < 0) throw new Error(`unexpected count: ${value}`);
  return value;
};
const weeks = activity.map((week) => [count(week.week) * 1000, count(week.total)]);

const releases = api(`repos/${repo}/releases?per_page=100`)
  .filter((release) => !release.draft)
  .map((release) => {
    if (!/^v?\d+\.\d+\.\d+(?:-[a-z]+\.\d+)?$/.test(release.tag_name))
      throw new Error(`tag ${release.tag_name}`);
    return [release.tag_name.replace(/^v?/, "v"), Date.parse(release.published_at)];
  })
  .sort((a, b) => a[1] - b[1]);
const { stargazers_count: stars } = api(`repos/${repo}`);

const target = fileURLToPath(
  new URL("../src/public/home/community/activity.json", import.meta.url),
);
writeFileSync(
  target,
  `${JSON.stringify({
    repository: repo,
    fetchedAt: new Date().toISOString(),
    stars: count(stars),
    columns: { weeks: ["weekStart", "commits"], releases: ["tag", "publishedAt"] },
    weeks,
    releases,
  })}\n`,
);
console.log(`wrote ${weeks.length} weeks and ${releases.length} releases to ${target}`);

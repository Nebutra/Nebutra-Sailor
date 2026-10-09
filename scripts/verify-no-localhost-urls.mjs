#!/usr/bin/env node
/**
 * verify-no-localhost-urls — post-deploy smoke: the rendered HTML of a live site
 * must not contain http://localhost, 127.0.0.1 or other local origins.
 *
 *   node scripts/verify-no-localhost-urls.mjs https://demo.example.com [/ /pricing ...]
 */
import { checkSiteForLocalhost } from "./lib/localhost-urls.mjs";

const [base, ...paths] = process.argv.slice(2);
if (!base) {
  console.error("usage: verify-no-localhost-urls.mjs <base-url> [path ...]");
  process.exit(2);
}
const problems = await checkSiteForLocalhost(
  base,
  paths.length > 0 ? paths : ["/", "/pricing", "/zh-Hans"],
);
if (problems.length > 0) {
  console.error(`\nlocal URLs shipped to ${base}:\n- ${problems.join("\n- ")}`);
  console.error(
    "\nA public URL env var (NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_URL, ...) was missing at build time.",
  );
  process.exit(1);
}
console.log(`ok   no local URLs in the rendered HTML of ${base}`);

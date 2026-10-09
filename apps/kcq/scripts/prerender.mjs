/**
 * Render each public route into dist/<path>.html (nginx serves `/home` from `/home.html`), then
 * drop the bare template. Usage: node prerender.mjs <ssr-out-dir> <dist-dir>
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [ssrDir, distDir] = process.argv.slice(2).map((dir) => resolve(dir));
const entry = readdirSync(ssrDir).find((file) => /^entry-server\.m?js$/.test(file));
if (!entry) throw new Error(`No prerender entry in ${ssrDir}`);
const server = await import(pathToFileURL(resolve(ssrDir, entry)).href);
const manifestPath = resolve(distDir, ".vite/ssr-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const templatePath = resolve(distDir, "public.html");
const template = readFileSync(templatePath, "utf8");

/**
 * Inline the page's stylesheets (style-src allows inline styles; scripts stay external for the
 * CSP). The first paint then waits on the HTML alone instead of two more round trips; the runtime
 * still knows the files, so a later client navigation loads them normally.
 */
function inlineStyles(html) {
  return (
    html
      // Module preloads would compete with the first paint on slow links (measured on /home: LCP
      // 2.6 s with them, 2.1 s without). The entry script still loads every chunk it imports.
      .replace(/<link rel="modulepreload"[^>]*>/g, "")
      .replace(/<link rel="stylesheet" crossorigin href="\/([^"]+\.css)">/g, (_tag, file) => {
        const css = readFileSync(resolve(distDir, file), "utf8");
        return `<style data-href="/${file}">${css}</style>`;
      })
  );
}

for (const { path } of server.PUBLIC_ROUTES) {
  const target = resolve(distDir, `.${path}.html`);
  mkdirSync(dirname(target), { recursive: true });
  const html = inlineStyles(await server.render(path, template, manifest));
  const canonical = `<link rel="canonical" href="${server.KCQ_ORIGIN}${path}">`;
  const checks = {
    "html lang": /<html lang="[^"]+">/.test(html),
    canonical: html.includes(canonical),
    "hreflang en, zh-Hans, x-default": html.match(/<link rel="alternate" hreflang=/g)?.length === 3,
    description: html.includes('<meta name="description"'),
    "one h1": html.match(/<h1[\s>]/g)?.length === 1,
    "route stylesheet": html.match(/<style data-href=/g)?.length >= 2,
    "og:image": /<meta property="og:image" content="[^"]+\/og\/home-(en|zh)\.png\?v=/.test(html),
  };
  const failed = Object.keys(checks).filter((name) => !checks[name]);
  if (failed.length) throw new Error(`Prerendered ${path} lacks: ${failed.join(", ")}`);
  try {
    // "wx" creates the file or fails if it exists: no check-then-write race.
    writeFileSync(target, html, { flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error(`Prerender would overwrite ${target}`);
    throw error;
  }
  console.log(`prerendered ${path} -> ${target.slice(distDir.length + 1)}`);
}
// Real 404 bodies (nginx error_page): same chrome, noindex, no canonical or alternates.
for (const { path } of server.NOT_FOUND_ROUTES) {
  const target = resolve(distDir, `.${path}.html`);
  mkdirSync(dirname(target), { recursive: true });
  const html = inlineStyles(await server.render(path, template, manifest));
  const checks = {
    "html lang": /<html lang="[^"]+">/.test(html),
    noindex: html.includes('<meta name="robots" content="noindex">'),
    "no canonical": !html.includes('rel="canonical"'),
    "one h1": html.match(/<h1[\s>]/g)?.length === 1,
    "a way into /app": html.includes('href="/app"'),
  };
  const failed = Object.keys(checks).filter((name) => !checks[name]);
  if (failed.length) throw new Error(`Prerendered ${path} lacks: ${failed.join(", ")}`);
  writeFileSync(target, html, { flag: "wx" });
  console.log(`prerendered ${path} -> ${target.slice(distDir.length + 1)}`);
}
rmSync(templatePath);
// The manifest is a build input, not something to serve.
rmSync(resolve(distDir, ".vite"), { recursive: true, force: true });

// Static SEO files must match the route table they describe (see src/public/seo-files.ts).
for (const [file, expected] of [
  ["robots.txt", server.renderRobotsTxt()],
  ["sitemap.xml", server.renderSitemapXml()],
]) {
  if (readFileSync(resolve(distDir, file), "utf8") !== expected) {
    throw new Error(`apps/kcq/public/${file} is out of date with src/public/routes.ts`);
  }
}

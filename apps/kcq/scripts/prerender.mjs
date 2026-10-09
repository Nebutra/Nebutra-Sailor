/**
 * Render each public route into dist/<path>.html (nginx serves `/home` from `/home.html`), then
 * drop the bare template. Usage: node prerender.mjs <ssr-out-dir> <dist-dir>
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [ssrDir, distDir] = process.argv.slice(2).map((dir) => resolve(dir));
const entry = readdirSync(ssrDir).find((file) => /^entry-server\.m?js$/.test(file));
if (!entry) throw new Error(`No prerender entry in ${ssrDir}`);
const server = await import(pathToFileURL(resolve(ssrDir, entry)).href);
const templatePath = resolve(distDir, "public.html");
const template = readFileSync(templatePath, "utf8");

for (const { path } of server.PUBLIC_ROUTES) {
  const target = resolve(distDir, `.${path}.html`);
  if (existsSync(target)) throw new Error(`Prerender would overwrite ${target}`);
  mkdirSync(dirname(target), { recursive: true });
  const html = await server.render(path, template);
  const canonical = `<link rel="canonical" href="${server.KCQ_ORIGIN}${path}">`;
  const checks = {
    "html lang": /<html lang="[^"]+">/.test(html),
    canonical: html.includes(canonical),
    "hreflang en, zh-Hans, x-default": html.match(/<link rel="alternate" hreflang=/g)?.length === 3,
    description: html.includes('<meta name="description"'),
    "one h1": html.match(/<h1[\s>]/g)?.length === 1,
  };
  const failed = Object.keys(checks).filter((name) => !checks[name]);
  if (failed.length) throw new Error(`Prerendered ${path} lacks: ${failed.join(", ")}`);
  writeFileSync(target, html);
  console.log(`prerendered ${path} -> ${target.slice(distDir.length + 1)}`);
}
rmSync(templatePath);

// Static SEO files must match the route table they describe (see src/public/seo-files.ts).
for (const [file, expected] of [
  ["robots.txt", server.renderRobotsTxt()],
  ["sitemap.xml", server.renderSitemapXml()],
]) {
  if (readFileSync(resolve(distDir, file), "utf8") !== expected) {
    throw new Error(`apps/kcq/public/${file} is out of date with src/public/routes.ts`);
  }
}

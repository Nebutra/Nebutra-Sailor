import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EMAIL_TEMPLATE_CATALOG } from "../../../packages/email/src/index";

const distDir = new URL("../dist/", import.meta.url);

await mkdir(distDir, { recursive: true });

const manifest = await Promise.all(
  EMAIL_TEMPLATE_CATALOG.map(async (template) => {
    const previewPath = join(distDir.pathname, template.fileName);
    const html = await readFile(previewPath, "utf8");

    return {
      ...template,
      bytes: Buffer.byteLength(html),
    };
  }),
);

const links = manifest
  .map(
    (template) => `<li>
      <a href="./${template.fileName}">${template.label}</a>
      <span>${template.description}</span>
    </li>`,
  )
  .join("\n");

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nebutra Email Preview</title>
    <style>
      :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; background: #f8fafc; color: #0f172a; }
      main { max-width: 880px; margin: 0 auto; padding: 48px 24px; }
      h1 { margin: 0 0 8px; font-size: 32px; letter-spacing: -0.04em; }
      p { margin: 0 0 24px; color: #475569; line-height: 1.6; }
      ul { display: grid; gap: 12px; list-style: none; margin: 0; padding: 0; }
      li { display: grid; gap: 4px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; }
      a { color: #0033fe; font-weight: 700; text-decoration: none; }
      span { color: #64748b; font-size: 14px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Nebutra Email Preview</h1>
      <p>Generated from the package-owned email template catalog.</p>
      <ul>${links}</ul>
    </main>
  </body>
</html>
`;

await writeFile(
  join(distDir.pathname, "preview-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(join(distDir.pathname, "index.html"), indexHtml);

process.stdout.write(`mail-preview export wrote ${manifest.length} entries\n`);

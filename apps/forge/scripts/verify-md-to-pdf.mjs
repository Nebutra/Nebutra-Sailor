#!/usr/bin/env node
/**
 * Hard-correct smoke: md-to-pdf product path must use Playwright Chromium.
 * Exit 0 only when Chromium launches and a real PDF is produced.
 *
 *   pnpm --filter @nebutra/forge md-to-pdf:verify
 *   # or after install:
 *   pnpm --filter @nebutra/forge playwright:install && pnpm --filter @nebutra/forge md-to-pdf:verify
 */
/* biome-ignore-all lint/suspicious/noConsole: CLI operator smoke script */
import { chromium } from "playwright";

const sample = `# Forge Chromium verify

**md-to-pdf** product path requires Playwright Chromium.

| Check | Expect |
| --- | --- |
| renderEngine | playwright |
| magic | %PDF |
`;

async function main() {
  // 1) Browser binary present
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("FAIL: Chromium launch failed.");
    console.error(message);
    console.error(
      "\nInstall product browsers on this host:\n" +
        "  pnpm --filter @nebutra/forge playwright:install\n" +
        "Linux hosts with missing OS libs:\n" +
        "  pnpm --filter @nebutra/forge playwright:install:deps\n",
    );
    process.exit(1);
  }

  try {
    const page = await browser.newPage();
    await page.setContent(
      `<!DOCTYPE html><html><body><h1>ok</h1><p>${sample.slice(0, 40)}</p></body></html>`,
      { waitUntil: "networkidle" },
    );
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    if (!Buffer.isBuffer(pdf) && !(pdf instanceof Uint8Array)) {
      throw new Error("page.pdf() did not return a buffer");
    }
    const buf = Buffer.from(pdf);
    if (buf.length < 100 || buf.subarray(0, 4).toString("utf8") !== "%PDF") {
      throw new Error(
        `Invalid PDF payload (${buf.length} bytes, head=${buf.subarray(0, 8).toString("hex")})`,
      );
    }
    console.log(`OK: Chromium print-to-PDF works (${buf.length} bytes).`);
  } finally {
    await browser.close();
  }

  // 2) forge-runtime path (same engine the API uses)
  try {
    const { renderMarkdownPdf } = await import("@nebutra/forge-runtime/pdf");
    const out = await renderMarkdownPdf({
      markdown: sample,
      title: "forge-chromium-verify",
      engine: "playwright",
    });
    if (out.renderEngine !== "playwright") {
      throw new Error(`Expected renderEngine=playwright, got ${out.renderEngine}`);
    }
    if (out.buf.subarray(0, 4).toString("utf8") !== "%PDF") {
      throw new Error("renderMarkdownPdf did not return a PDF");
    }
    console.log(`OK: @nebutra/forge-runtime md-to-pdf playwright path (${out.buf.length} bytes).`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("FAIL: forge-runtime md-to-pdf playwright path failed.");
    console.error(message);
    process.exit(1);
  }

  console.log("Hard-correct: md-to-pdf product path is ready on this host.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

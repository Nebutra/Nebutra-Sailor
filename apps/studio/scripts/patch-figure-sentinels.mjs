#!/usr/bin/env node
/**
 * Replace `FIGURE:<id>` placeholder paragraphs in a published post body with
 * uploaded Sanity image blocks.
 *
 * Usage:
 *   SANITY_API_TOKEN=... node apps/studio/scripts/patch-figure-sentinels.mjs \
 *     --assets apps/studio/content/blog/assets/sleptons-project \
 *     --alt-map apps/studio/content/blog/assets/sleptons-project/alt.json \
 *     --doc post-sleptons-project-en --language en \
 *     --doc post-sleptons-project-zh --language zh \
 *     [--site-url https://nebutra.com] [--no-revalidate] [--dry-run]
 */

import { createHmac } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@sanity/client";

const DEFAULT_SITE_URL = "https://nebutra.com";

function parseArgs(argv) {
  const out = { docs: [], languages: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "dry-run" || key === "no-revalidate") {
      out[key === "dry-run" ? "dryRun" : "noRevalidate"] = true;
      continue;
    }
    const value = argv[i + 1];
    i += 1;
    if (key === "doc") out.docs.push(value);
    else if (key === "language") out.languages.push(value);
    else out[key] = value;
  }
  return out;
}

/**
 * Patching `body` in place does not go through the publish script, so nothing
 * else tells the site its cached article is stale. Without this the images land
 * in Sanity and the live page keeps serving the pre-patch render.
 */
async function revalidatePost({ siteUrl, slug, language }) {
  const body = JSON.stringify({ _type: "post", slug: { current: slug }, language });
  const headers = { "content-type": "application/json" };
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (secret) {
    headers["sanity-webhook-signature"] = createHmac("sha256", secret).update(body).digest("hex");
  }

  const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/blog/webhook`, {
    method: "POST",
    headers,
    body,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Revalidation failed (${response.status}): ${text}`);
  return text;
}

const SENTINEL = /^FIGURE:([a-z0-9-]+)$/;

function blockText(block) {
  if (block?._type !== "block") return null;
  const children = Array.isArray(block.children) ? block.children : [];
  return children
    .map((child) => (typeof child?.text === "string" ? child.text : ""))
    .join("")
    .trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const assetsDir = path.resolve(args.assets);
  const altMap = JSON.parse(await readFile(path.resolve(args["alt-map"]), "utf8"));

  const projectId = process.env.SANITY_PROJECT_ID || "wyfqr24v";
  const dataset = process.env.SANITY_DATASET || "production";
  const token = process.env.SANITY_API_TOKEN;
  if (!token && !args.dryRun) throw new Error("SANITY_API_TOKEN is required.");

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-10-01",
    token,
    useCdn: false,
  });

  const files = (await readdir(assetsDir)).filter((name) => name.endsWith(".png"));
  const figureFiles = new Map(
    files.map((name) => [
      name.replace(/^fig-/, "").replace(/\.png$/, ""),
      path.join(assetsDir, name),
    ]),
  );

  // Upload every figure once; both language siblings reuse the same assets.
  const assetIds = new Map();
  for (const [figureId, filePath] of figureFiles) {
    if (args.dryRun) {
      assetIds.set(figureId, `dry-run-${figureId}`);
      continue;
    }
    const asset = await client.assets.upload("image", createReadStream(filePath), {
      filename: path.basename(filePath),
    });
    assetIds.set(figureId, asset._id);
    process.stderr.write(`uploaded ${figureId}\n`);
  }

  for (const [index, docId] of args.docs.entries()) {
    const language = args.languages[index];
    const doc = await client.getDocument(docId);
    if (!doc) throw new Error(`Document not found: ${docId}`);

    let replaced = 0;
    const missing = [];
    const body = doc.body.map((block, blockIndex) => {
      const text = blockText(block);
      const match = text && SENTINEL.exec(text);
      if (!match) return block;

      const figureId = match[1];
      const assetId = assetIds.get(figureId);
      const copy = altMap[figureId];
      if (!assetId || !copy) {
        missing.push(figureId);
        return block;
      }

      replaced += 1;
      return {
        _type: "image",
        _key: block._key || `figure-${figureId}-${blockIndex}`,
        asset: { _type: "reference", _ref: assetId },
        alt: copy.alt?.[language] ?? copy.alt?.en,
        caption: copy.caption?.[language] ?? copy.caption?.en,
      };
    });

    if (missing.length) {
      throw new Error(`No asset/alt copy for: ${[...new Set(missing)].join(", ")}`);
    }

    let revalidation = null;
    if (!args.dryRun) {
      await client.patch(docId).set({ body }).commit();

      const slug = doc.slug?.current;
      if (!args.noRevalidate && slug) {
        revalidation = await revalidatePost({
          siteUrl: args["site-url"] || DEFAULT_SITE_URL,
          slug,
          language: doc.language ?? language,
        });
      }
    }

    process.stdout.write(
      `${JSON.stringify({
        docId,
        language,
        replaced,
        blocks: body.length,
        dryRun: Boolean(args.dryRun),
        revalidation,
      })}\n`,
    );
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});

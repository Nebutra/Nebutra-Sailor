#!/usr/bin/env node

import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@sanity/client";

const DEFAULT_PROJECT_ID = "wyfqr24v";
const DEFAULT_DATASET = "production";
const DEFAULT_API_VERSION = "2024-01-01";
const DEFAULT_SITE_URL = "https://nebutra.com";

function printHelp() {
  process.stdout.write(`Publish or update one localized Nebutra blog post in Sanity.

Usage:
  pnpm --filter @nebutra/studio blog:publish -- \\
    --file ./content/blog/why-we-build-nebutra.zh.md \\
    --language zh \\
    --slug why-we-build-nebutra-zh \\
    --translation-key why-we-build-nebutra \\
    --title "Why We Are Building Nebutra" \\
    --excerpt "Short summary..." \\
    --author "Tseka Luk" \\
    --categories "Nebutra,Founder Notes"

Options:
  --file <path>             Markdown file to publish. Required.
  --language <en|zh>        Localized document language. Required.
  --slug <slug>             Public slug. Required.
  --translation-key <key>   Shared key across localized versions. Required.
  --title <title>           Post title. Defaults to the first H1 in the markdown.
  --excerpt <text>          Post excerpt. Defaults to frontmatter excerpt.
  --author <name>           Author name. Defaults to "Tseka Luk".
  --categories <csv>        Category titles. Defaults to "Nebutra".
  --source-kind <kind>      original | commentary | syndicated. Defaults to original.
  --source-url <url>        Original source URL for commentary/syndication.
  --source-title <title>    Original source title.
  --source-author <name>    Original author.
  --source-publisher <org>  Original publisher / organization.
  --source-license <text>   License or permission note.
  --canonical-url <url>     Optional SEO canonical override.
  --published-at <iso>      Publish datetime. Defaults to now.
  --site-url <url>          Site URL used for revalidation. Defaults to ${DEFAULT_SITE_URL}.
  --dry-run                 Parse and validate only; do not mutate Sanity.
  --no-revalidate           Skip the production revalidation webhook.
  --help                    Show this help.

Environment:
  SANITY_API_TOKEN          Required unless --dry-run. Token needs document write access.
  SANITY_WEBHOOK_SECRET     Optional. Used to sign the blog revalidation request.
  NEXT_PUBLIC_SANITY_*      Optional project/dataset/api-version overrides.
`);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }

    const key = arg.slice(2);
    if (["dry-run", "no-revalidate", "help"].includes(key)) {
      args[key] = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function documentId(translationKey, language) {
  return `post-${slugify(translationKey)}-${language}`;
}

function key() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function parseFrontmatter(source) {
  if (!source.startsWith("---\n")) {
    return { data: {}, markdown: source };
  }

  const end = source.indexOf("\n---", 4);
  if (end === -1) {
    return { data: {}, markdown: source };
  }

  const raw = source.slice(4, end).trim();
  const data = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, rawKey, rawValue] = match;
    const value = rawValue.trim().replace(/^["']|["']$/g, "");
    data[rawKey] = value;
  }

  return { data, markdown: source.slice(end + 4).replace(/^\r?\n/, "") };
}

function makeSpan(text, marks = []) {
  return {
    _type: "span",
    _key: key(),
    text,
    marks,
  };
}

function parseInline(text) {
  const children = [];
  const markDefs = [];
  const tokenPattern =
    /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      children.push(makeSpan(text.slice(lastIndex, match.index)));
    }

    if (match[2] && match[3]) {
      const markKey = key();
      markDefs.push({
        _type: "link",
        _key: markKey,
        href: match[3],
      });
      children.push(makeSpan(match[2], [markKey]));
    } else if (match[4]) {
      children.push(makeSpan(match[4], ["code"]));
    } else if (match[5]) {
      children.push(makeSpan(match[5], ["strong"]));
    } else if (match[6]) {
      children.push(makeSpan(match[6], ["em"]));
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    children.push(makeSpan(text.slice(lastIndex)));
  }

  return {
    children: children.length ? children : [makeSpan("")],
    markDefs,
  };
}

function block(style, text, extra = {}) {
  const inline = parseInline(text);
  return {
    _type: "block",
    _key: key(),
    style,
    children: inline.children,
    markDefs: inline.markDefs,
    ...extra,
  };
}

function parseCodeFenceMeta(rawMeta) {
  let meta = rawMeta.trim();
  let filename = null;

  meta = meta.replace(/\b(?:filename|title)=("[^"]+"|'[^']+'|\S+)/, (_, rawValue) => {
    filename = rawValue.replace(/^["']|["']$/g, "");
    return "";
  });

  meta = meta.replace(/\[([^\]]+)\]/, (_, rawValue) => {
    filename = rawValue.trim();
    return "";
  });

  const language = meta.trim().split(/\s+/)[0] || "text";
  return { language, filename };
}

function codeBlock(meta, code) {
  const { language, filename } = parseCodeFenceMeta(meta);
  return {
    _type: "code",
    _key: key(),
    language,
    filename,
    code,
  };
}

function flushParagraph(lines, blocks) {
  if (!lines.length) return;
  blocks.push(block("normal", lines.join(" ").replace(/\s+/g, " ").trim()));
  lines.length = 0;
}

function markdownToPortableText(markdown, title) {
  const blocks = [];
  const paragraph = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let skippedTitle = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const fence = rawLine.match(/^\s*(```|~~~)\s*([^`]*)$/);
    if (fence) {
      flushParagraph(paragraph, blocks);
      const [, marker, meta] = fence;
      const codeLines = [];

      while (lineIndex + 1 < lines.length) {
        lineIndex += 1;
        const nextLine = lines[lineIndex];
        if (new RegExp(`^\\s*${marker}\\s*$`).test(nextLine)) break;
        codeLines.push(nextLine);
      }

      blocks.push(codeBlock(meta, codeLines.join("\n")));
      continue;
    }

    const line = rawLine.trim();

    if (!line) {
      flushParagraph(paragraph, blocks);
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph(paragraph, blocks);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, blocks);
      const headingText = heading[2].trim();
      if (!skippedTitle && title && heading[1] === "#" && headingText === title) {
        skippedTitle = true;
        continue;
      }
      skippedTitle = true;
      blocks.push(block(`h${Math.min(heading[1].length, 6)}`, headingText));
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph(paragraph, blocks);
      const quoteText = quote[1].trim();
      if (quoteText) {
        blocks.push(block("blockquote", quoteText));
      }
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph(paragraph, blocks);
      blocks.push(block("normal", bullet[1].trim(), { listItem: "bullet", level: 1 }));
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph(paragraph, blocks);
      blocks.push(block("normal", numbered[1].trim(), { listItem: "number", level: 1 }));
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph(paragraph, blocks);
  return blocks;
}

function csv(value, fallback) {
  const source = value || fallback;
  return source
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readOption(args, data, ...keys) {
  for (const optionKey of keys) {
    const value = optionalString(args[optionKey]) ?? optionalString(data[optionKey]);
    if (value) return value;
  }
  return undefined;
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function readContentSource(args, data) {
  const kind =
    readOption(args, data, "source-kind", "contentSourceKind", "sourceKind") ?? "original";
  if (!["original", "commentary", "syndicated"].includes(kind)) {
    throw new Error("--source-kind must be original, commentary, or syndicated.");
  }

  return compactObject({
    kind,
    originalTitle: readOption(args, data, "source-title", "originalTitle", "sourceTitle"),
    originalUrl: readOption(args, data, "source-url", "originalUrl", "sourceUrl"),
    originalAuthor: readOption(args, data, "source-author", "originalAuthor", "sourceAuthor"),
    publisher: readOption(args, data, "source-publisher", "publisher", "sourcePublisher"),
    license: readOption(args, data, "source-license", "license", "sourceLicense"),
    canonicalUrl: readOption(args, data, "canonical-url", "canonicalUrl"),
  });
}

function requireValue(args, keyName) {
  const value = args[keyName];
  if (!value) {
    throw new Error(`Missing required option --${keyName}`);
  }
  return value;
}

function createSanityClient(token) {
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || DEFAULT_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || DEFAULT_DATASET,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || DEFAULT_API_VERSION,
    useCdn: false,
    token,
  });
}

async function findOrCreateAuthor(client, name) {
  const existing = await client.fetch('*[_type == "author" && name == $name][0]._id', { name });
  if (existing) return existing;

  const created = await client.create({
    _type: "author",
    name,
    slug: { _type: "slug", current: slugify(name) },
  });
  return created._id;
}

async function findOrCreateCategory(client, title) {
  const existing = await client.fetch('*[_type == "category" && title == $title][0]._id', {
    title,
  });
  if (existing) return existing;

  const created = await client.create({
    _type: "category",
    title,
    slug: { _type: "slug", current: slugify(title) },
  });
  return created._id;
}

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
  if (!response.ok) {
    throw new Error(`Revalidation failed (${response.status}): ${text}`);
  }

  return text;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const file = requireValue(args, "file");
  const language = requireValue(args, "language");
  if (!["en", "zh"].includes(language)) {
    throw new Error("--language must be either en or zh");
  }

  const token = process.env.SANITY_API_TOKEN;
  if (!args["dry-run"] && !token) {
    throw new Error("SANITY_API_TOKEN is required unless --dry-run is set.");
  }

  const source = await readFile(path.resolve(file), "utf8");
  const { data, markdown } = parseFrontmatter(source);
  const title = args.title || data.title || markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!title) {
    throw new Error("Missing --title and no H1 title found in markdown.");
  }

  const slug = args.slug || data.slug;
  const translationKey = args["translation-key"] || data.translationKey || data["translation-key"];
  const excerpt = args.excerpt || data.excerpt || "";
  const author = args.author || data.author || "Tseka Luk";
  const categories = csv(args.categories || data.categories, "Nebutra");
  const publishedAt = args["published-at"] || data.publishedAt || new Date().toISOString();
  const siteUrl = args["site-url"] || DEFAULT_SITE_URL;
  const contentSource = readContentSource(args, data);

  if (!slug) throw new Error("Missing --slug or frontmatter slug.");
  if (!translationKey) throw new Error("Missing --translation-key or frontmatter translationKey.");

  const body = markdownToPortableText(markdown, title);
  const id = documentId(translationKey, language);

  const summary = {
    id,
    title,
    slug,
    language,
    translationKey,
    excerptLength: excerpt.length,
    author,
    categories,
    publishedAt,
    contentSource,
    blocks: body.length,
  };

  if (args["dry-run"]) {
    process.stdout.write(`${JSON.stringify({ ok: true, dryRun: true, summary }, null, 2)}\n`);
    return;
  }

  const client = createSanityClient(token);
  const authorId = await findOrCreateAuthor(client, author);
  const categoryIds = await Promise.all(
    categories.map((category) => findOrCreateCategory(client, category)),
  );

  const documentFields = {
    title,
    slug: { _type: "slug", current: slug },
    language,
    translationKey,
    publishedAt,
    excerpt,
    contentSource,
    author: { _type: "reference", _ref: authorId },
    categories: categoryIds.map((categoryId) => ({
      _type: "reference",
      _ref: categoryId,
      _key: key(),
    })),
    body,
  };

  await client.createIfNotExists({ _id: id, _type: "post" });
  const result = await client.patch(id).set(documentFields).commit({ autoGenerateArrayKeys: true });

  let revalidation = null;
  if (!args["no-revalidate"]) {
    revalidation = await revalidatePost({ siteUrl, slug, language });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        summary,
        sanity: { id: result._id, updatedAt: result._updatedAt },
        revalidation,
        url: `${siteUrl.replace(/\/$/, "")}${language === "zh" ? "/zh" : ""}/blog/${slug}`,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});

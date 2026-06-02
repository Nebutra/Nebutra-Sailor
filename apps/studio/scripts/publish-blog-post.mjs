#!/usr/bin/env node

import { createHmac, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
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
  --main-image <path>       Optional local image file to upload as the post cover.
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

function getBlockPlainText(value) {
  return value?.children?.map((child) => child.text ?? "").join("") ?? "";
}

function pushTextWithCitations(children, markDefs, text, marks = []) {
  const citationPattern = /\[(\d{1,2})\]/g;
  let lastIndex = 0;
  let match;

  while ((match = citationPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      children.push(makeSpan(text.slice(lastIndex, match.index), marks));
    }

    const refNumber = Number.parseInt(match[1], 10);
    const markKey = key();
    markDefs.push({
      _type: "citation",
      _key: markKey,
      refNumber,
      href: `#ref${refNumber}`,
    });
    children.push(makeSpan(String(refNumber), [...marks, markKey]));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    children.push(makeSpan(text.slice(lastIndex), marks));
  }
}

function parseInline(text) {
  const children = [];
  const markDefs = [];
  const tokenPattern =
    /(\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\$([^$\n]+)\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushTextWithCitations(children, markDefs, text.slice(lastIndex, match.index));
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
      pushTextWithCitations(children, markDefs, match[5], ["strong"]);
    } else if (match[6]) {
      pushTextWithCitations(children, markDefs, match[6], ["em"]);
    } else if (match[7]) {
      children.push(makeSpan(match[7], ["mathInline"]));
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    pushTextWithCitations(children, markDefs, text.slice(lastIndex));
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

function flushParagraph(lines, blocks) {
  if (!lines.length) return;
  blocks.push(block("normal", lines.join(" ").replace(/\s+/g, " ").trim()));
  lines.length = 0;
}

function isTableRow(line) {
  return line.includes("|") && /^\|?.+\|.+\|?$/.test(line.trim());
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function tableBlock(rows) {
  return {
    _type: "table",
    _key: key(),
    rows: rows.map((cells) => ({
      _type: "tableRow",
      _key: key(),
      cells,
    })),
  };
}

function parseCodeFenceMeta(rawMeta) {
  const meta = rawMeta.trim();
  const language = meta.match(/^([A-Za-z0-9_-]+)/)?.[1] || "text";
  const filename =
    meta.match(/(?:title|filename)=["']([^"']+)["']/)?.[1] ?? meta.match(/\[(.+?)\]/)?.[1] ?? null;
  const highlightedLines = [];
  const highlightMatch = meta.match(/\{([0-9,\s-]+)\}/);
  if (highlightMatch?.[1]) {
    for (const part of highlightMatch[1].split(",")) {
      const range = part.trim();
      if (!range) continue;
      const [startRaw, endRaw] = range.split("-").map((item) => Number.parseInt(item, 10));
      if (!Number.isFinite(startRaw)) continue;
      const end = Number.isFinite(endRaw) ? endRaw : startRaw;
      for (let line = startRaw; line <= end; line += 1) highlightedLines.push(line);
    }
  }

  return { filename, highlightedLines, language };
}

function codeBlock(code, meta) {
  return {
    _type: "code",
    _key: key(),
    code,
    language: meta.language,
    ...(meta.filename ? { filename: meta.filename } : {}),
    ...(meta.highlightedLines.length ? { highlightedLines: meta.highlightedLines } : {}),
  };
}

function mathBlock(math) {
  return {
    _type: "mathBlock",
    _key: key(),
    math: math.trim(),
  };
}

function mermaidBlock(code) {
  return {
    _type: "mermaid",
    _key: key(),
    code: code.trimEnd(),
  };
}

function ctaBlock({ title, body, items, ctaLabel, ctaHref }) {
  return {
    _type: "ctaBlock",
    _key: key(),
    title,
    body,
    items: items.map((item) => ({
      _key: key(),
      title: item.title,
      body: item.body,
    })),
    ctaLabel,
    ctaHref,
  };
}

function maybePromoteCtaBlock(blocks) {
  if (process.env.BLOG_DISABLE_CTA_PROMOTION === "1") return blocks;

  const promoted = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const blockValue = blocks[index];
    const title = getBlockPlainText(blockValue);
    const isCtaHeading =
      blockValue?._type === "block" &&
      blockValue.style === "h2" &&
      /生产环境|production/i.test(title);

    if (!isCtaHeading) {
      promoted.push(blockValue);
      continue;
    }

    const section = [];
    let cursor = index + 1;
    while (cursor < blocks.length) {
      const nextBlock = blocks[cursor];
      if (nextBlock?._type === "block" && /^h[2-6]$/.test(nextBlock.style ?? "")) break;
      section.push(nextBlock);
      cursor += 1;
    }

    const linkBlock = section.find((candidate) => {
      const text = getBlockPlainText(candidate).trim();
      return (
        candidate?._type === "block" &&
        candidate.style === "normal" &&
        candidate.markDefs?.some((markDef) => typeof markDef.href === "string") &&
        /架构评估|architecture assessment/i.test(text)
      );
    });
    const linkMark = linkBlock?.markDefs?.find((markDef) => typeof markDef.href === "string");

    if (!linkBlock || !linkMark) {
      promoted.push(blockValue);
      continue;
    }

    const body = section
      .filter(
        (candidate) =>
          candidate?._type === "block" &&
          candidate.style === "normal" &&
          !candidate.listItem &&
          candidate !== linkBlock,
      )
      .map((candidate) => getBlockPlainText(candidate).trim())
      .filter(Boolean)
      .join("\n\n");

    const items = section
      .filter((candidate) => candidate?._type === "block" && candidate.listItem === "bullet")
      .map((candidate) => {
        const text = getBlockPlainText(candidate).trim();
        const [rawTitle, ...rest] = text.split(/[：:]\s*/);
        return {
          title: rawTitle || text,
          body: rest.join(": ").trim(),
        };
      })
      .filter((item) => item.title);

    promoted.push(
      ctaBlock({
        title,
        body,
        items,
        ctaLabel: getBlockPlainText(linkBlock).trim(),
        ctaHref: linkMark.href,
      }),
    );
    index = cursor - 1;
  }

  return promoted;
}

function markdownToPortableText(markdown, title) {
  const blocks = [];
  const paragraph = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let skippedTitle = false;
  let inReferences = false;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph(paragraph, blocks);
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph(paragraph, blocks);
      continue;
    }

    if (line === "$$") {
      flushParagraph(paragraph, blocks);
      const mathLines = [];
      index += 1;

      while (index < lines.length && lines[index].trim() !== "$$") {
        mathLines.push(lines[index]);
        index += 1;
      }

      blocks.push(mathBlock(mathLines.join("\n")));
      continue;
    }

    const singleLineMath = line.match(/^\$\$\s*(.+?)\s*\$\$$/);
    if (singleLineMath) {
      flushParagraph(paragraph, blocks);
      blocks.push(mathBlock(singleLineMath[1]));
      continue;
    }

    const fence = line.match(/^```(.*)$/);
    if (fence) {
      flushParagraph(paragraph, blocks);
      const codeLines = [];
      const meta = parseCodeFenceMeta(fence[1] ?? "");
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (meta.language.toLowerCase() === "mermaid") {
        blocks.push(mermaidBlock(codeLines.join("\n")));
      } else {
        blocks.push(codeBlock(codeLines.join("\n"), meta));
      }
      continue;
    }

    if (isTableRow(line) && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      flushParagraph(paragraph, blocks);
      const rows = [splitTableRow(line)];
      index += 2;

      while (index < lines.length && isTableRow(lines[index].trim())) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      index -= 1;
      blocks.push(tableBlock(rows));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, blocks);
      const headingText = heading[2].trim();
      if (!skippedTitle) {
        skippedTitle = true;
        if (heading[1] === "#" && headingText === title) {
          continue;
        }
      }
      inReferences = /^(References|参考来源)$/.test(headingText);
      blocks.push(block(`h${Math.min(heading[1].length, 6)}`, headingText));
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph(paragraph, blocks);
      const quoteText = quote[1].trim();
      if (quoteText) {
        const quotedBullet = quoteText.match(/^[-*]\s+(.+)$/);
        if (quotedBullet) {
          blocks.push(block("normal", quotedBullet[1].trim(), { listItem: "bullet", level: 1 }));
          continue;
        }

        const quotedNumbered = quoteText.match(/^\d+\.\s+(.+)$/);
        if (quotedNumbered) {
          blocks.push(block("normal", quotedNumbered[1].trim(), { listItem: "number", level: 1 }));
          continue;
        }

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

    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      flushParagraph(paragraph, blocks);
      blocks.push(
        block("normal", numbered[2].trim(), {
          listItem: "number",
          level: 1,
          ...(inReferences ? { referenceNumber: Number.parseInt(numbered[1], 10) } : {}),
        }),
      );
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph(paragraph, blocks);
  return maybePromoteCtaBlock(blocks);
}

function csv(value, fallback) {
  const source = value || fallback;
  return source
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

async function uploadMainImage(client, imagePath) {
  const absolutePath = path.resolve(imagePath);
  const asset = await client.assets.upload("image", createReadStream(absolutePath), {
    filename: path.basename(absolutePath),
  });

  return {
    _type: "image",
    asset: {
      _type: "reference",
      _ref: asset._id,
    },
  };
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
  const mainImage = args["main-image"] || data.mainImage || data["main-image"] || null;
  const publishedAt = args["published-at"] || data.publishedAt || new Date().toISOString();
  const siteUrl = args["site-url"] || DEFAULT_SITE_URL;

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
    mainImage: mainImage ? path.basename(mainImage) : null,
    publishedAt,
    blocks: body.length,
    blockTypes: body.map((block) => block._type),
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
  const mainImageField = mainImage ? await uploadMainImage(client, mainImage) : null;

  const documentFields = {
    title,
    slug: { _type: "slug", current: slug },
    language,
    translationKey,
    publishedAt,
    excerpt,
    author: { _type: "reference", _ref: authorId },
    categories: categoryIds.map((categoryId) => ({
      _type: "reference",
      _ref: categoryId,
      _key: key(),
    })),
    ...(mainImageField ? { mainImage: mainImageField } : {}),
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

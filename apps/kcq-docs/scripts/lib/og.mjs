/**
 * OG images (1200 × 630) for every docs page, drawn from the built page itself: the og:image path,
 * og:title and og:description are read from the exported HTML, so a card never drifts from its page.
 * Text becomes vector outlines (opentype.js) from local font files and sharp rasterizes the SVG,
 * the same approach as apps/kcq/scripts/og-images.mjs: no system fonts, no network.
 */
import { mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";
import { pathData } from "./brand.mjs";

const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(join(appRoot, "package.json"));
const W = 1200;
const H = 630;
const PAD = 80;

function parse(file) {
  const buffer = readFileSync(file);
  return opentype.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );
}

let fonts;
function loadFonts() {
  if (fonts) return fonts;
  const geist = resolve(dirname(require.resolve("geist/font/sans")), "fonts/geist-sans");
  fonts = {
    title: parse(resolve(geist, "Geist-Medium.ttf")),
    body: parse(resolve(geist, "Geist-Regular.ttf")),
    hanTitle: parse(
      require.resolve(
        "@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-500-normal.woff",
      ),
    ),
    hanBody: parse(
      require.resolve(
        "@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff",
      ),
    ),
  };
  return fonts;
}

const isHan = (char) => /[⺀-鿿　-〿＀-￯]/.test(char);

function advance(char, size, latin, han) {
  const face = isHan(char) ? han : latin;
  return (face.charToGlyph(char).advanceWidth / face.unitsPerEm) * size;
}

/** Greedy wrap: break at spaces for Latin, anywhere between Han characters. */
function wrap(text, size, maxWidth, latin, han, maxLines) {
  const raw = text.match(/[⺀-鿿　-〿＀-￯]|[^\s⺀-鿿　-〿＀-￯]+|\s+/g) ?? [];
  // Closing punctuation never starts a line (kinsoku): glue it to the token before.
  const tokens = [];
  for (const token of raw) {
    if (/^[，。、；：！？）」』》,.;:!?)]$/.test(token) && tokens.length)
      tokens[tokens.length - 1] += token;
    else tokens.push(token);
  }
  const lines = [];
  let line = "";
  let width = 0;
  for (const token of tokens) {
    const w = [...token].reduce((sum, c) => sum + advance(c, size, latin, han), 0);
    if (width + w > maxWidth && line.trim()) {
      lines.push(line.trimEnd());
      line = /^\s+$/.test(token) ? "" : token;
      width = /^\s+$/.test(token) ? 0 : w;
    } else {
      line += token;
      width += w;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s*\S{0,3}$/, "")}…`;
    return kept;
  }
  return lines;
}

function textPath(text, x, y, size, latin, han) {
  const parts = [];
  let cursor = x;
  for (const char of text) {
    const face = isHan(char) ? han : latin;
    parts.push(pathData(face.getPath(char, cursor, y, size)));
    cursor += advance(char, size, latin, han);
  }
  return parts.join("");
}

export function card({ title, description, lang, wordmark, colors }) {
  const f = loadFonts();
  const titleSize = 64;
  const titleLines = wrap(title, titleSize, W - PAD * 2, f.title, f.hanTitle, 3);
  const bodySize = 28;
  const bodyLines = description
    ? wrap(description, bodySize, W - PAD * 2, f.body, f.hanBody, 2)
    : [];
  const titleTop = 250;
  const titlePaths = titleLines
    .map((line, i) =>
      textPath(line, PAD, titleTop + i * titleSize * 1.15, titleSize, f.title, f.hanTitle),
    )
    .join("");
  const bodyTop = titleTop + (titleLines.length - 1) * titleSize * 1.15 + 64;
  const bodyPaths = bodyLines
    .map((line, i) =>
      textPath(line, PAD, bodyTop + i * bodySize * 1.45, bodySize, f.body, f.hanBody),
    )
    .join("");
  const label = lang === "zh" ? "文档" : "Docs";
  // Wordmark at 26px cap height, baseline y = 112; the divider and label follow its real width.
  const scale = 26 / wordmark.capHeight;
  const wordX = PAD + 48;
  const divider = Math.round(wordX + wordmark.width * scale + 22);
  const labelPath = textPath(label, divider + 22, 112, 26, f.title, f.hanTitle);
  const url = textPath(
    `kcq.nebutra.com${lang === "zh" ? "/zh" : ""}/docs`,
    PAD,
    H - 64,
    22,
    f.body,
    f.hanBody,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${colors.ground}"/>
  <g transform="translate(${PAD} 82) scale(2.1)"><path d="${wordmark.glyph}" fill="${colors.accent}"/></g>
  <g transform="translate(${wordX} 112) scale(${scale})"><path d="${wordmark.d}" fill="${colors.ink}"/></g>
  <rect x="${divider}" y="84" width="1.5" height="34" fill="${colors.rule}"/>
  <path d="${labelPath}" fill="${colors.muted}"/>
  <path d="${titlePaths}" fill="${colors.ink}"/>
  <path d="${bodyPaths}" fill="${colors.muted}"/>
  <rect x="${PAD}" y="${H - 112}" width="${W - PAD * 2}" height="1" fill="${colors.rule}"/>
  <path d="${url}" fill="${colors.muted}"/>
</svg>`;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

/** Merge every `--name: value;` of the blocks a selector pattern matches (later blocks win). */
function readAll(css, pattern) {
  const vars = new Map();
  for (const block of css.matchAll(pattern)) {
    for (const m of block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi))
      vars.set(m[1], m[2].trim());
  }
  return vars;
}

export async function renderOgImages(dist) {
  const wordmark = JSON.parse(readFileSync(join(appRoot, "src/generated/wordmark.json"), "utf8"));
  const tokens = readFileSync(join(appRoot, "src/generated/tokens.css"), "utf8");
  const dark = readAll(tokens, /(?:^|\n)\[data-theme='dark'\]\s*\{([^}]*)\}/g);
  const root = readAll(tokens, /(?:^|\n):root\s*\{([^}]*)\}/g);
  const colors = {
    ground: dark.get("--klc-color-ui-background"),
    ink: dark.get("--klc-color-ui-text"),
    muted: dark.get("--klc-color-ui-muted"),
    rule: dark.get("--klc-color-ui-border"),
    accent: root.get("--klc-brand-accent"),
  };
  for (const [key, value] of Object.entries(colors)) {
    if (!value || value.startsWith("var("))
      throw new Error(`OG colour ${key} unresolved (${value})`);
  }
  let count = 0;
  const jobs = [];
  for (const file of walk(dist).filter((f) => f.endsWith(".html") && !f.endsWith("404.html"))) {
    const html = readFileSync(file, "utf8");
    const image = html.match(
      /<meta property="og:image" content="https?:\/\/[^/]+(\/docs\/og\/[^"]+\.png)"/,
    )?.[1];
    if (!image) continue;
    const title = decode(html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? "");
    const description = decode(
      html.match(/<meta property="og:description" content="([^"]*)"/)?.[1] ?? "",
    );
    const lang = /<html[^>]*lang="zh/.test(html) ? "zh" : "en";
    const target = join(dist, image);
    mkdirSync(dirname(target), { recursive: true });
    const svg = card({ title, description, lang, wordmark, colors });
    jobs.push(sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(target));
    count += 1;
    if (jobs.length >= 8) await Promise.all(jobs.splice(0));
  }
  await Promise.all(jobs);
  return count;
}

/**
 * Build-time OG images (1200 × 630, one per locale) and the apple-touch icon, drawn from the
 * prerendered pages themselves: the og:image URL, the h1 and the description are read from
 * dist/home.html and dist/zh/home.html, so the card can never drift from the page. Text becomes
 * vector outlines (opentype.js) from the self-hosted fonts, so the render needs no system fonts:
 * Outfit 600 (Latin display), Noto Sans SC 700 (Han), Geist Mono (meta). The light behind the mark
 * is the hero poster, the field's own opening frame.
 *
 * Usage: node og-images.mjs <dist-dir> <chart-source-dir>
 */
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";
import { readVars } from "./landing-source.mjs";

const [distDir, source] = process.argv.slice(2).map((dir) => resolve(dir));
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(resolve(root, "package.json"));
const W = 1200;
const H = 630;

const font = (file) => {
  const buffer = readFileSync(file);
  return opentype.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );
};
const geistDir = resolve(dirname(require.resolve("geist/font/sans")), "fonts");
const fonts = {
  display: font(require.resolve("@fontsource/outfit/files/outfit-latin-600-normal.woff")),
  han: font(
    require.resolve(
      "@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff",
    ),
  ),
  mono: font(resolve(geistDir, "geist-mono/GeistMono-Regular.ttf")),
};

const tokens = (file) =>
  readVars(readFileSync(resolve(source, "packages/core/design-tokens/css", file), "utf8"));
const dark = tokens("theme.pro.dark.css");
const color = {
  ground: dark.get("--klc-color-chart-background"),
  ink: dark.get("--klc-color-ui-text"),
  muted: dark.get("--klc-color-ui-muted"),
  rule: dark.get("--klc-color-ui-border"),
};

/** Pick the face per character: Han from Noto Sans SC, everything else from the display face. */
const faceFor = (char, latin) => (/[　-鿿＀-￯]/.test(char) ? fonts.han : latin);

function measure(text, size, latin) {
  let width = 0;
  for (const char of text) {
    const face = faceFor(char, latin);
    width += (face.charToGlyph(char).advanceWidth / face.unitsPerEm) * size;
  }
  return width;
}

/** One line of text as SVG path data, with display tracking. */
function textPath(text, x, y, size, latin, tracking = 0) {
  let cursor = x;
  let d = "";
  for (const char of text) {
    const face = faceFor(char, latin);
    const glyph = face.charToGlyph(char);
    // opentype.js prints NaN for some unrounded float origins; snap to 1/100 px.
    d += glyph
      .getPath(Math.round(cursor * 100) / 100, Math.round(y * 100) / 100, size)
      .toPathData(2);
    cursor += (glyph.advanceWidth / face.unitsPerEm) * size + tracking * size;
  }
  return d;
}

/** Greedy wrap: on spaces for Latin, per character for Han. */
function wrap(text, size, latin, maxWidth) {
  // Han breaks between characters; Latin words (and the "K" of "K 线") stay whole.
  const tokens = text.match(/[^ \t　-鿿＀-￯]+ [　-鿿]|[　-鿿＀-￯]|[^ \t　-鿿＀-￯]+ *| +/g) ?? [];
  const lines = [""];
  for (const token of tokens) {
    const next = lines.at(-1) + token;
    if (measure(next.trimEnd(), size, latin) > maxWidth && lines.at(-1))
      lines.push(token.trimStart());
    else lines[lines.length - 1] = next;
  }
  return lines.map((line) => line.trimEnd());
}

const d_check = (d) => d.includes("NaN");

const readMeta = (html, property) =>
  html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`))?.[1];
const decode = (text) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const poster = resolve(root, "src/public/home/hero/poster/poster-dark-1600.webp");
const background = await sharp(poster)
  .resize(W, H, { fit: "cover", position: "right" })
  .png()
  .toBuffer();

for (const page of ["home.html", "zh/home.html"]) {
  const html = readFileSync(resolve(distDir, page), "utf8");
  const image = readMeta(html, "og:image");
  if (!image) throw new Error(`${page} has no og:image`);
  const target = resolve(distDir, new URL(image).pathname.slice(1));
  const heading = decode(html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] ?? "");
  const han = /[　-鿿]/.test(heading);
  const size = han ? 60 : 68;
  const lines = wrap(heading, size, fonts.display, 640);
  const lineHeight = size * (han ? 1.2 : 1.0);
  const top = 250;
  const headingPaths = lines
    .map((line, index) =>
      textPath(line, 72, top + index * lineHeight, size, fonts.display, han ? 0 : -0.035),
    )
    .join("");
  if (d_check(headingPaths)) throw new Error(`${page}: NaN in heading outline`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <path d="${textPath("KLineChartQuant", 72, 120, 34, fonts.display, -0.02)}" fill="${color.ink}"/>
  <path d="${headingPaths}" fill="${color.ink}"/>
  <rect x="72" y="${H - 104}" width="${W - 144}" height="1" fill="${color.rule}"/>
  <path d="${textPath("KCQ.NEBUTRA.COM  ·  APACHE-2.0  ·  BY NEBUTRA", 72, H - 64, 20, fonts.mono, 0.04)}" fill="${color.muted}"/>
</svg>`;
  mkdirSync(dirname(target), { recursive: true });
  await sharp(background)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png({ compressionLevel: 9, palette: false })
    .toFile(target);
  console.log(`og image -> ${target.slice(distDir.length + 1)} (${lines.length} lines)`);
}

// Apple touch icon: the glyph in Cobalt on the dark ground (iOS applies its own corner mask).
const accent = readVars(
  readFileSync(resolve(source, "packages/core/design-tokens/css/foundation.css"), "utf8"),
).get("--klc-brand-accent");
const glyph = readFileSync(resolve(root, "public/favicon.svg"), "utf8").match(/ d="([^"]+)"/)?.[1];
if (!glyph) throw new Error("public/favicon.svg has no glyph path");
await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="-6 -6 28 28"><rect x="-6" y="-6" width="28" height="28" fill="${color.ground}"/><path d="${glyph}" fill="${accent}"/></svg>`,
  ),
)
  .png()
  .toFile(resolve(distDir, "apple-touch-icon.png"));
console.log("apple-touch-icon.png");

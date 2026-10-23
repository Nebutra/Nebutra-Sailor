/**
 * Build-time OG images (1200 × 630, one per locale) and the apple-touch icon, drawn from the
 * prerendered pages themselves: the og:image URL, the h1 and (on /benchmark) the comparison
 * figure's rows are read from dist/home.html, dist/investors.html, dist/benchmark.html and their zh
 * twins, so a card can never drift from its page. Text becomes vector outlines (opentype.js) from the self-hosted fonts, so the render needs no system fonts:
 * Outfit 600 (Latin display), Noto Sans SC 700 (Han), Geist Mono (meta). The light behind the mark
 * is the hero poster, the field's own opening frame; the benchmark card glows in the accent instead.
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
  accent: tokens("foundation.css").get("--klc-brand-accent"),
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

const readMeta = (html, property) =>
  html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`))?.[1];
const decode = (text) =>
  text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // &amp; last, so "&amp;lt;" decodes to "&lt;" rather than "<".
    .replace(/&amp;/g, "&");

/** The first capture of `pattern` in `html`, decoded; a page missing it fails the build. */
function capture(html, pattern, page) {
  const match = html.match(pattern)?.[1];
  if (!match) throw new Error(`${page}: no match for ${pattern}`);
  return decode(match);
}

const isHan = (text) => /[　-鿿]/.test(text);

/** The wordmark, the rule and the mono footer every card shares, around a card's own body. */
const frame = (
  body,
  footer,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <path d="${textPath("KLineChartQuant", 72, 120, 34, fonts.display, -0.02)}" fill="${color.ink}"/>
  ${body}
  <rect x="72" y="${H - 104}" width="${W - 144}" height="1" fill="${color.rule}"/>
  <path d="${textPath(footer, 72, H - 64, 20, fonts.mono, 0.04)}" fill="${color.muted}"/>
</svg>`;

const poster = await sharp(resolve(root, "src/public/home/hero/poster/poster-dark-1600.webp"))
  .resize(W, H, { fit: "cover", position: "right" })
  .png()
  .toBuffer();

// The benchmark card's ground: the chart background with one accent glow behind the figure panel.
const glow = await sharp(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><radialGradient id="g" cx="840" cy="290" r="560" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${color.accent}" stop-opacity="0.24"/>
    <stop offset="1" stop-color="${color.accent}" stop-opacity="0"/>
  </radialGradient></defs>
  <rect width="${W}" height="${H}" fill="${color.ground}"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
</svg>`),
)
  .png()
  .toBuffer();

/** Home and investors: the h1, up to three lines, over the hero poster. */
function headingCard(html, page) {
  const heading = capture(html, /<h1[^>]*>([^<]+)<\/h1>/, page);
  const han = isHan(heading);
  // Longer headlines step down in size until they fit three lines above the rule.
  let size = han ? 60 : 68;
  let lines = wrap(heading, size, fonts.display, 640);
  while (lines.length > 3 && size > 44) {
    size -= 4;
    lines = wrap(heading, size, fonts.display, 640);
  }
  const lineHeight = size * (han ? 1.2 : 1.0);
  const headingPaths = lines
    .map((line, index) =>
      textPath(line, 72, 250 + index * lineHeight, size, fonts.display, han ? 0 : -0.035),
    )
    .join("");
  return {
    background: poster,
    svg: frame(
      `<path d="${headingPaths}" fill="${color.ink}"/>`,
      "KCQ.NEBUTRA.COM  ·  APACHE-2.0  ·  BY NEBUTRA",
    ),
    note: `${lines.length} lines`,
  };
}

/**
 * The comparison figure's opening tier as the page prerendered it: rows least time first, each with
 * its bar and round range as fractions of the page's shared axis (the --share/--low/--high it styles).
 */
function figureRows(figure, page) {
  const rows = [...figure.matchAll(/<li class="compare-row[^"]*"([^>]*)>(.*?)<\/li>/g)].map(
    ([, attrs, body]) => {
      const fraction = (name) => Number(attrs.match(new RegExp(`--${name}:([0-9.]+)`))?.[1]);
      return {
        kcq: attrs.includes('data-kcq="true"'),
        share: fraction("share"),
        low: fraction("low"),
        high: fraction("high"),
        library: capture(body, /class="row-library[^"]*"[^>]*>([^<]+)/, page),
        renderer: capture(body, /class="row-renderer[^"]*"[^>]*>([^<]+)/, page),
        value: capture(body, /class="row-value[^"]*"[^>]*>([^<]+)/, page),
      };
    },
  );
  if (!rows.length) throw new Error(`${page}: the comparison figure has no rows`);
  for (const row of rows) {
    if (![row.share, row.low, row.high].every((value) => value > 0))
      throw new Error(`${page}: ${row.library} ${row.renderer} has no bar geometry`);
  }
  return rows;
}

/**
 * /benchmark: the headline and the figure's caption on the left, the ranked bars on the right. Bars
 * keep the page's proportions, rescaled so the slowest round reaches the panel's edge.
 */
function benchmarkCard(html, page) {
  const heading = capture(html, /<h1[^>]*>([^<]+)<\/h1>/, page);
  const figure = capture(html, /(<figure class="compare [\s\S]*?<\/figure>)/, page);
  const caption = capture(figure, /class="t-label"[^>]*>([^<]+)/, page);
  const lower = capture(figure, /class="t-ui compare-hint"[^>]*>([^<]+)/, page);
  const tier = capture(figure, /aria-checked="true"[^>]*>([^<]+)/, page);
  const rows = figureRows(figure, page);

  // One clause per line where it fits, so the headline reads "subject, / claim".
  const han = isHan(heading);
  const size = han ? 56 : 52;
  const lineHeight = size * (han ? 1.2 : 1.04);
  const lines = heading
    .split(/(?<=[,，])\s*/)
    .flatMap((clause) => wrap(clause, size, fonts.display, 440));
  if (lines.length > 3) throw new Error(`${page}: the headline needs ${lines.length} lines`);
  const headingTop = 232;
  const captionTop = headingTop + (lines.length - 1) * lineHeight + 64;
  const left = [
    `<path d="${lines.map((line, index) => textPath(line, 72, headingTop + index * lineHeight, size, fonts.display, han ? 0 : -0.03)).join("")}" fill="${color.ink}"/>`,
    `<path d="${textPath(caption, 72, captionTop, 24, fonts.display)}" fill="${color.ink}"/>`,
    `<path d="${textPath(`${tier}  ·  ${lower}`.toUpperCase(), 72, captionTop + 34, 18, fonts.mono, 0.04)}" fill="${color.muted}"/>`,
  ];

  const panel = { x: 560, y: 84, width: 568, height: 420, pad: 28 };
  const trackX = panel.x + panel.pad;
  const trackWidth = panel.width - 2 * panel.pad;
  const firstBaseline = panel.y + panel.pad + 18;
  // The last bar (baseline + 12, 12 high) ends on the panel's bottom padding.
  const pitch = (panel.y + panel.height - panel.pad - 24 - firstBaseline) / (rows.length - 1);
  const top = Math.max(...rows.map((row) => row.high));
  const at = (fraction) => trackX + (fraction / top) * trackWidth;
  const right = rows.map((row, index) => {
    const baseline = firstBaseline + index * pitch;
    const barY = baseline + 12;
    const middle = barY + 6;
    const libraryWidth = measure(row.library, 21, fonts.display);
    const value = `${row.value} ms`;
    const valueWidth = measure(value, 19, fonts.mono) + 0.02 * 19 * (value.length - 1);
    const fill = row.kcq ? color.accent : color.muted;
    return [
      `<path d="${textPath(row.library, trackX, baseline, 21, fonts.display)}" fill="${color.ink}"/>`,
      `<path d="${textPath(row.renderer, trackX + libraryWidth + 10, baseline, 15, fonts.mono, 0.02)}" fill="${fill}"/>`,
      `<path d="${textPath(value, trackX + trackWidth - valueWidth, baseline, 19, fonts.mono, 0.02)}" fill="${color.ink}"/>`,
      `<rect x="${trackX}" y="${barY}" width="${trackWidth}" height="12" rx="6" fill="${color.ink}" fill-opacity="0.05"/>`,
      `<rect x="${trackX}" y="${barY}" width="${at(row.share) - trackX}" height="12" rx="6" fill="${fill}" fill-opacity="${row.kcq ? 1 : 0.6}"/>`,
      // The hairline from the fastest to the slowest round, as on the page.
      `<rect x="${at(row.low)}" y="${middle - 0.75}" width="${at(row.high) - at(row.low)}" height="1.5" fill="${color.ink}" fill-opacity="0.75"/>`,
      `<rect x="${at(row.low) - 0.75}" y="${middle - 5}" width="1.5" height="10" fill="${color.ink}" fill-opacity="0.75"/>`,
      `<rect x="${at(row.high) - 0.75}" y="${middle - 5}" width="1.5" height="10" fill="${color.ink}" fill-opacity="0.75"/>`,
    ].join("");
  });

  return {
    background: glow,
    svg: frame(
      [
        ...left,
        `<rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}" rx="20" fill="${color.ink}" fill-opacity="0.035" stroke="${color.rule}"/>`,
        ...right,
      ].join("\n  "),
      "KCQ.NEBUTRA.COM/BENCHMARK  ·  RAW DATA PUBLISHED",
    ),
    note: `${rows.length} rows, ${tier}`,
  };
}

const CARDS = {
  "home.html": headingCard,
  "zh/home.html": headingCard,
  "investors.html": headingCard,
  "zh/investors.html": headingCard,
  "benchmark.html": benchmarkCard,
  "zh/benchmark.html": benchmarkCard,
};

for (const [page, card] of Object.entries(CARDS)) {
  const html = readFileSync(resolve(distDir, page), "utf8");
  const image = readMeta(html, "og:image");
  if (!image) throw new Error(`${page} has no og:image`);
  const target = resolve(distDir, new URL(image).pathname.slice(1));
  const { background, svg, note } = card(html, page);
  // opentype.js can print NaN into an outline; a card with one would render blank shapes.
  if (svg.includes("NaN")) throw new Error(`${page}: NaN in the card`);
  mkdirSync(dirname(target), { recursive: true });
  await sharp(background)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png({ compressionLevel: 9, palette: false })
    .toFile(target);
  console.log(`og image -> ${target.slice(distDir.length + 1)} (${note})`);
}

// Apple touch icon: the glyph in Cobalt on the dark ground (iOS applies its own corner mask).
const glyph = readFileSync(resolve(root, "public/favicon.svg"), "utf8").match(/ d="([^"]+)"/)?.[1];
if (!glyph) throw new Error("public/favicon.svg has no glyph path");
await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="-6 -6 28 28"><rect x="-6" y="-6" width="28" height="28" fill="${color.ground}"/><path d="${glyph}" fill="${color.accent}"/></svg>`,
  ),
)
  .png()
  .toFile(resolve(distDir, "apple-touch-icon.png"));
console.log("apple-touch-icon.png");

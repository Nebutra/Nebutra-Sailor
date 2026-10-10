/** Small Markdown helpers shared by the generators. */
import { existsSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";

const CJK = /[㐀-鿿豈-﫿]/g;

/** Language a source document is written in: Chinese when Han characters dominate the prose. */
export function detectLanguage(text) {
  const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  const han = prose.match(CJK)?.length ?? 0;
  const latinWords = prose.match(/[A-Za-z]{2,}/g)?.length ?? 0;
  return han > latinWords * 0.6 ? "zh" : "en";
}

export const hasHan = (text) => /[㐀-鿿]/.test(text);

/** YAML frontmatter; every value is JSON-quoted, which is valid YAML. */
export function frontmatter(data) {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

/** Split off the first H1 (the page title) and return the remaining body. */
export function takeTitle(markdown, fallback) {
  const match = markdown.match(/^\s*#\s+(.+?)\s*#*\s*$/m);
  if (!match || markdown.slice(0, match.index).trim() !== "")
    return { title: fallback, body: markdown };
  return {
    title: match[1].replace(/`/g, "").trim(),
    body: markdown.slice((match.index ?? 0) + match[0].length).replace(/^\s+/, ""),
  };
}

/** First prose paragraph as plain text, for descriptions and search snippets. */
export function firstParagraph(markdown, max = 160) {
  const blocks = markdown
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b && !/^(#|>|\||[-*+] |\d+\. |!\[|<)/.test(b));
  const text = (blocks[0] ?? "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(
    cut.lastIndexOf("。"),
    cut.lastIndexOf(". "),
    cut.lastIndexOf("，"),
    cut.lastIndexOf(", "),
  );
  return `${(stop > max * 0.5 ? cut.slice(0, stop + 1) : cut).trim()}…`;
}

const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

/**
 * Rewrite relative links in an imported document: links to another imported document point at
 * its docs page; anything else in the repository points at GitHub at the pinned commit.
 */
export function rewriteLinks(markdown, { from, source, routeFor, links, rawBase }) {
  return markdown.replace(
    /(!?)\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g,
    (all, bang, label, href, title) => {
      if (/^(https?:|mailto:|#|\/\/)/.test(href)) return all;
      const [path, hash] = href.split("#");
      if (!path) return all;
      const target = posix.normalize(posix.join(posix.dirname(from), path)).replace(/^\.\//, "");
      const route = routeFor(target);
      let url;
      if (route) url = route + (hash ? `#${hash}` : "");
      else if (bang || IMAGE.test(target)) url = `${rawBase}/${target}`;
      else if (existsSync(resolve(source, target)) || existsSync(resolve(source, dirname(target))))
        url = links.blob(target) + (hash ? `#${hash}` : "");
      else url = links.blob(target);
      return `${bang}[${label}](${url}${title})`;
    },
  );
}

export function semverCompare(a, b) {
  const parse = (v) => {
    const [core, pre] = v.replace(/^v/, "").split("-");
    return { nums: core.split(".").map(Number), pre };
  };
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i += 1) if (x.nums[i] !== y.nums[i]) return x.nums[i] - y.nums[i];
  if (!x.pre && y.pre) return 1;
  if (x.pre && !y.pre) return -1;
  if (!x.pre && !y.pre) return 0;
  const [xa, xn] = x.pre.split(".");
  const [ya, yn] = y.pre.split(".");
  if (xa !== ya) return xa < ya ? -1 : 1;
  return Number(xn ?? 0) - Number(yn ?? 0);
}

/** Escape text for an MDX table cell or paragraph. */
export function mdxText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/[{}<>]/g, (c) => `\\${c}`)
    .replace(/\n+/g, " ");
}

/** Inline code safe inside an MDX table cell. */
export function mdxCode(text) {
  const value = String(text).replace(/\|/g, "\\|").replace(/\n+/g, " ");
  return value.includes("`") ? `\`\` ${value} \`\`` : `\`${value}\``;
}

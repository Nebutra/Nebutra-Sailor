/**
 * Public-page build inputs derived from the pinned chart source (see landing-source.mjs):
 * - `virtual:kcq-tokens.css`: the generated `--klc-*` foundation plus the default preset per mode
 * - `virtual:kcq-presets`: per preset × mode colours for the theme previews
 * - `virtual:kcq-facts`: proof-strip facts, each with the source file it was counted from
 * - `virtual:kcq-code`: the developer snippets, highlighted by Shiki at build time into spans that
 *   read `--shiki-token-*` variables (mapped to KCQ tokens in home-developers.vue), so code follows
 *   the colour mode and the page ships no highlighter
 * It also inlines the blocking theme-init script into public.html: the theme must be known before
 * first paint, and an extra request would delay it. The CSP admits it by hash (THEME_INIT_CSP).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildTokensCss, readFacts, readPresetPalettes } from "./landing-source.mjs";

const MODULES = {
  "virtual:kcq-tokens.css": "\0kcq-tokens.css",
  "virtual:kcq-presets": "\0kcq-presets",
  "virtual:kcq-facts": "\0kcq-facts",
  "virtual:kcq-code": "\0kcq-code",
};

/** Shiki language per snippet file extension. */
const LANGS = { vue: "vue", tsx: "tsx", html: "html", ts: "ts" };

/**
 * Highlight each snippet once at build time. The CSS-variables theme emits colours as
 * `var(--shiki-token-*)`, so the page maps them onto its own tokens per mode. Returns the lines
 * inside `<code>` only: the component owns the frame, numbering and copy button.
 */
export async function highlightSnippets(snippets) {
  const { createCssVariablesTheme, createHighlighter } = await import("shiki");
  const theme = createCssVariablesTheme({
    name: "kcq",
    variablePrefix: "--shiki-",
    fontStyle: true,
  });
  const highlighter = await createHighlighter({ themes: [theme], langs: Object.values(LANGS) });
  try {
    return snippets.map((snippet) => {
      const lang = LANGS[snippet.file.split(".").pop()];
      if (!lang) throw new Error(`No highlighter language for ${snippet.file}`);
      const html = highlighter.codeToHtml(snippet.code, { lang, theme: "kcq" });
      const inner = /<code>([\s\S]*)<\/code>/.exec(html)?.[1];
      if (!inner) throw new Error(`Shiki output for ${snippet.file} has no <code>`);
      return { id: snippet.id, html: inner, lines: snippet.code.split("\n").length };
    });
  } finally {
    highlighter.dispose();
  }
}

/** Mirrors src/public/theme.ts (THEME_STORAGE_KEY, resolution order); theme.test.ts pins it. */
export const THEME_INIT_SCRIPT =
  "(function(){var d=document.documentElement;try{var p=localStorage.getItem('kcq:theme');" +
  "var t=p==='light'||p==='dark'?p:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';" +
  "d.setAttribute('data-theme',t)}catch(e){}})();";

/** CSP source for the inline script; infra/fly/kcq.security-headers.conf allows exactly this. */
export const THEME_INIT_CSP = `'sha256-${createHash("sha256").update(THEME_INIT_SCRIPT).digest("base64")}'`;

export function kcqLandingPlugin({ root, source }) {
  const pin = JSON.parse(readFileSync(resolve(root, "chart-source.json"), "utf8"));
  const tokenDir = resolve(source, "packages/core/design-tokens/css");
  return {
    name: "kcq-landing",
    resolveId(id) {
      return MODULES[id];
    },
    async load(id) {
      if (id === MODULES["virtual:kcq-tokens.css"]) {
        this.addWatchFile(tokenDir);
        return buildTokensCss(source);
      }
      if (id === MODULES["virtual:kcq-presets"]) {
        return `export default ${JSON.stringify(readPresetPalettes(source))};`;
      }
      if (id === MODULES["virtual:kcq-code"]) {
        const file = resolve(root, "src/public/home/developer-snippets.ts");
        this.addWatchFile(file);
        // Node strips the file's TypeScript annotations natively (Node >= 22.18).
        const { SNIPPETS } = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
        return `export default ${JSON.stringify(await highlightSnippets(SNIPPETS))};`;
      }
      if (id === MODULES["virtual:kcq-facts"]) {
        return `export default ${JSON.stringify(readFacts(source, pin))};`;
      }
      return undefined;
    },
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        if (!context.filename.endsWith("public.html")) return html;
        return {
          html,
          tags: [
            {
              tag: "script",
              children: THEME_INIT_SCRIPT,
              injectTo: "head-prepend",
            },
          ],
        };
      },
    },
  };
}

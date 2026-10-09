/**
 * Public-page build inputs derived from the pinned chart source (see landing-source.mjs):
 * - `virtual:kcq-tokens.css`: the generated `--klc-*` foundation plus the default preset per mode
 * - `virtual:kcq-presets`: per preset × mode colours for the theme previews
 * - `virtual:kcq-facts`: proof-strip facts, each with the source file it was counted from
 * It also inlines the blocking theme-init script into public.html: the theme must be known before
 * first paint, and an extra request would delay it. The CSP admits it by hash (THEME_INIT_CSP).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildTokensCss, readFacts, readPresetPalettes } from "./landing-source.mjs";

const MODULES = {
  "virtual:kcq-tokens.css": "\0kcq-tokens.css",
  "virtual:kcq-presets": "\0kcq-presets",
  "virtual:kcq-facts": "\0kcq-facts",
};

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
    load(id) {
      if (id === MODULES["virtual:kcq-tokens.css"]) {
        this.addWatchFile(tokenDir);
        return buildTokensCss(source);
      }
      if (id === MODULES["virtual:kcq-presets"]) {
        return `export default ${JSON.stringify(readPresetPalettes(source))};`;
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

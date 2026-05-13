/**
 * <ThemeScript /> — server-rendered FOUC-prevention script.
 *
 * Must be mounted from a Server Component (typically `app/layout.tsx`).
 * Renders an inline `<script>` into the SSR HTML so it runs synchronously
 * before the browser paints the first frame — applying the user's saved
 * theme to `<html>` so there's no light/dark flash on first load.
 *
 * Pairs with the client-side {@link ThemeProvider} in this package — both
 * read the same `localStorage` key and apply the same attribute.
 *
 * Rendering this from a Server Component (not a Client Component) avoids
 * the React 19 / Next.js 16 dev-mode warning about scripts inside Client
 * Components.
 */

// NB: do NOT import from "./theme-provider" here. theme-provider is a Client
// Component (has "use client"), and importing it from this Server Component
// pulls the file into the client bundle, which makes Turbopack treat the
// rendered <script> as living inside a Client Component and re-triggers the
// React 19 "scripts inside React components" warning. We duplicate the one
// shared constant intentionally to preserve the server/client boundary.
const DEFAULT_STORAGE_KEY = "theme";

export interface ThemeScriptProps {
  /** localStorage key. Default: `"theme"` — matches `<ThemeProvider>`. */
  storageKey?: string;
  /** Which `<html>` attribute to set. Default: `"class"`. */
  attribute?: "class" | "data-theme";
  /** Default theme when nothing is stored. Default: `"system"`. */
  defaultTheme?: "light" | "dark" | "system";
  /** CSP nonce — forwarded to the rendered `<script>` tag. */
  nonce?: string;
}

function buildScriptSource(
  storageKey: string,
  attribute: "class" | "data-theme",
  defaultTheme: "light" | "dark" | "system",
): string {
  const applyClass = `r.classList.remove("light","dark");r.classList.add(t);`;
  const applyData = `r.setAttribute("data-theme",t);`;
  const apply = attribute === "class" ? applyClass : applyData;
  return `(function(){try{var s=localStorage.getItem(${JSON.stringify(storageKey)})||${JSON.stringify(defaultTheme)};var t=s==="system"?(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):s;var r=document.documentElement;${apply}r.style.colorScheme=t;}catch(e){}})();`;
}

export function ThemeScript({
  storageKey = DEFAULT_STORAGE_KEY,
  attribute = "class",
  defaultTheme = "system",
  nonce,
}: ThemeScriptProps) {
  const source = buildScriptSource(storageKey, attribute, defaultTheme);
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted inline FOUC-prevention script — content is generated from constants, no user input
      dangerouslySetInnerHTML={{ __html: source }}
      nonce={nonce}
    />
  );
}

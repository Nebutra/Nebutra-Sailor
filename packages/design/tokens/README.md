# @nebutra/tokens

> Runtime design tokens and theme provider for Nebutra apps. Single source of truth for CSS variables, color scales, and light/dark mode switching.

## Installation

```bash
pnpm add @nebutra/tokens
```

## Usage

### CSS Tokens (in your app's `globals.css`)

```css
@import "@nebutra/tokens/styles.css";
```

This provides:
- Brand color scales (`--nebutra-blue-*`, `--nebutra-cyan-*`)
- 12-step functional scales (`--neutral-1..12`, `--blue-1..12`, `--cyan-1..12`)
- Semantic variables (`--primary`, `--background`, `--border`, etc.)
- Light/dark mode via `:root` / `.dark`
- Display-P3 wide gamut with sRGB fallback
- Tailwind v4 `@theme` integration

### Theme Provider (in your root layout)

```tsx
import { ThemeProvider } from "@nebutra/tokens";

export default function RootLayout({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      {children}
    </ThemeProvider>
  );
}
```

### Theme Hook

```tsx
import { useTheme } from "@nebutra/tokens";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle theme
    </button>
  );
}
```

## API

| Export | Description |
|--------|-------------|
| `ThemeProvider` | React provider for light/dark mode (custom; class + cookie, not next-themes) |
| `useTheme()` | Hook to read/set current theme |
| `ThemeProviderProps` | Props type for ThemeProvider |
| `THEME_IDS` | `["light", "dark"]` (appearance mode, not design language) |
| `ThemeId` | `"light" \| "dark"` |
| `DEFAULT_THEME` | `"dark"` |

## Token Architecture

```
@nebutra/design-tokens  --> DTCG JSON + Style Dictionary → build/css/styles.generated.css
@nebutra/tokens         --> styles.css (copied from generated; verify:parity must stay 100%)
@nebutra/theme          --> design languages (Brand Packages, applyLanguage)
@nebutra/ui             --> components (consume tokens via CSS vars)
```

### Regenerating `styles.css`

```bash
pnpm --filter @nebutra/design-tokens build
pnpm --filter @nebutra/design-tokens verify:parity   # requires 100%
pnpm --filter @nebutra/tokens sync                   # copies styles.generated.css → styles.css
```

### Brand Packages (design-language skins)

```ts
import { emitBrandCss, type BrandPackage } from "@nebutra/tokens/brand-package";

// Optional dual light/dark palettes (orthogonal to catalog language id):
const brand: BrandPackage = {
  id: "acme",
  name: "Acme",
  darkDefault: false,
  version: "1.0.0",
  semantic: { /* default mode */ },
  modes: {
    light: { semantic: { /* light */ } },
    dark: { semantic: { /* dark */ } },
  },
  recipe: { buttonDefault: "solid", density: "comfortable", radii: {…}, elevationTokens: {…} },
  typography: { fontSans: "Inter, sans-serif" },
};
// emit: light under :root/html[data-brand]; dark under .dark/html.dark[data-brand]
```

## Peer Dependencies

- `react` ^19

## License

MIT

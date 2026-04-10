# @nebutra/tokens

> Runtime design tokens and theme provider for Nebutra apps. Single source of truth for CSS variables, color scales, and light/dark mode switching.

## Installation

```bash
# Internal monorepo dependency
pnpm add @nebutra/tokens@workspace:*
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
| `ThemeProvider` | React provider for light/dark mode (from next-themes) |
| `useTheme()` | Hook to read/set current theme |
| `ThemeProviderProps` | Props type for ThemeProvider |
| `THEME_IDS` | `["light", "dark"]` |
| `ThemeId` | `"light" \| "dark"` |
| `DEFAULT_THEME` | `"dark"` |

## Token Architecture

```
@nebutra/brand   --> Brand primitives (source data, not runtime)
@nebutra/tokens  --> Runtime CSS variables (THIS PACKAGE)
@nebutra/theme   --> Multi-theme presets (oklch, 6 variants)
@nebutra/ui      --> Components (consume tokens via CSS vars)
```

## Peer Dependencies

- `react` ^19

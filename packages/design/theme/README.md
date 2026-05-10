# @nebutra/theme

CSS-only theme engine for Nebutra — Tailwind v4 `@theme` tokens, `data-theme` selectors, and a `next-themes` re-export.

## Design Intent

All visual theming in Nebutra is expressed as CSS custom properties scoped to `[data-theme="<id>"]` selectors defined in `themes.css`. There is no JavaScript theme object or runtime style computation. The `data-theme` attribute is toggled by `next-themes` (re-exported here as `ThemeProvider` and `useTheme`), making the theme system framework-agnostic at the CSS layer while remaining ergonomic in React apps.

Apps import a single CSS file and a single provider — no per-component theme wiring required.

## Usage

```tsx
// In your root layout
import { ThemeProvider } from "@nebutra/theme";
import "@nebutra/theme/themes.css";

<ThemeProvider attribute="data-theme" defaultTheme="neon">
  {children}
</ThemeProvider>
```

## Available Themes

`neon` | `gradient` | `dark-dense` | `minimal` | `vibrant` | `ocean`

The `THEME_IDS` constant and `ThemeId` type are exported for use in theme switcher components.

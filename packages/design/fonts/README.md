# @nebutra/fonts

Status: WIP — Not yet integrated into any production app.

Self-hosted OSS font registry for Nebutra themes and imported DESIGN.md font
families.

The package has two entries:

- `@nebutra/fonts` is client-safe and maps a CSS font-family stack to the
  registry CSS variable that should be prepended.
- `@nebutra/fonts/next` is server-only and declares build-time `next/font`
  faces plus the combined registry class name.

## Installation

```bash
pnpm add @nebutra/fonts
```

## Usage

Apply registry font variables at the application root:

```tsx
import { fontRegistryClassName } from "@nebutra/fonts/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontRegistryClassName}>
      <body>{children}</body>
    </html>
  );
}
```

Resolve theme or DESIGN.md stacks on the client-safe path:

```ts
import { withRegistryFont } from "@nebutra/fonts";

const stack = withRegistryFont("Space Grotesk, sans-serif");
// "var(--font-space-grotesk), Space Grotesk, sans-serif"
```

## Registered Families

The registry includes Geist, Inter, Space Grotesk, Playfair Display, JetBrains
Mono, Manrope, Sora, Work Sans, DM Sans, Plus Jakarta Sans, Outfit, Figtree,
Montserrat, Lexend, Fira Code, Roboto Mono, and Source Code Pro.

## Runtime Model

`next/font` downloads and self-hosts Google fonts at build time. At runtime,
the browser requests fonts from the application origin only when an element
uses the corresponding CSS variable.

## License

MIT

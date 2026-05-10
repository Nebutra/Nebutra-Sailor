# @nebutra/ui

UI layer for the **AI Chat** product feature (`apps/web /chat` route).
Built on [Lobe UI](https://github.com/lobehub/lobe-ui) + [Lobe Icons](https://github.com/lobehub/lobe-icons) + Lucide Icons.

## Design Intent

| Dependency       | Purpose                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `@lobehub/ui`    | Chat bubbles, streaming text, model selector, chat input, markdown renderer   |
| `@lobehub/icons` | AI provider icons: OpenAI, Anthropic, Claude, Gemini, Mistral, DeepSeek, etc. |
| `antd`           | Back-office admin tables / forms if needed in enterprise tier                 |

Usage in `apps/web`:

```tsx
import { ChatList, ChatInputArea } from "@nebutra/ui/components";
import { Anthropic, Claude } from "@nebutra/ui/icons";
```

## Installation

```bash
pnpm add @nebutra/ui
```

## Usage

### Theme Provider

Wrap your app with `NebutraThemeProvider` to apply Nebutra design tokens:

```tsx
import { NebutraThemeProvider } from "@nebutra/ui";

function App() {
  return (
    <NebutraThemeProvider appearance="auto">
      <YourApp />
    </NebutraThemeProvider>
  );
}
```

### Components

```tsx
import { Button, ChatList, ActionIcon } from "@nebutra/ui/components";

<Button type="primary">Submit</Button>
<ActionIcon icon={<Settings />} />
```

### AI Provider Icons

```tsx
import { OpenAI, Anthropic, Google, Claude, Gemini } from "@nebutra/ui/icons";

// In a model selector
<OpenAI size={24} />
<Anthropic size={24} />
<Google size={24} />
```

### All Lobe Icons

```tsx
import { HuggingFace, Mistral, DeepSeek, Qwen } from "@nebutra/ui/icons";
```

### General UI Icons (Lucide)

```tsx
import { Settings, Search, Menu, Plus, Check } from "@nebutra/ui/icons";

<Settings size={20} />;
```

### Design Tokens

Runtime design tokens live in `@nebutra/tokens/styles.css` (CSS variables).
Use Tailwind classes or `var()` in your components:

```tsx
// Tailwind classes (preferred)
<div className="bg-primary text-foreground border-border" />

// CSS variables (when Tailwind isn't available)
<div style={{ color: "var(--color-primary)" }} />
```

> **Note:** `@nebutra/ui/theme` also exports JS token objects (`tokens`, `colors`, etc.)
> but these are an internal Lobe UI bridge and are deprecated for app use.

## Exports

| Path                     | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `@nebutra/ui`            | Main exports (theme provider + common components/icons) |
| `@nebutra/ui/components` | All Lobe UI components + AnimateIn                      |
| `@nebutra/ui/layout`     | Layout components (PageHeader, EmptyState, etc.)        |
| `@nebutra/ui/icons`      | All icons (Lobe + Lucide)                               |
| `@nebutra/ui/theme`      | Lobe UI theme provider (NebutraThemeProvider)           |
| `@nebutra/ui/primitives` | Design primitive tokens (spacing, typography, etc.)     |
| `@nebutra/ui/typography` | Typography system (font families, type styles)          |
| `@nebutra/ui/utils`      | Utilities (cn, etc.)                                    |

## Available AI Icons

- **OpenAI**: `OpenAI`, `ChatGPT`, `Gpt`
- **Anthropic**: `Anthropic`, `Claude`
- **Google**: `Google`, `Gemini`, `GoogleColor`
- **Meta**: `Meta`, `Llama`
- **Mistral**: `Mistral`
- **Cohere**: `Cohere`
- **Hugging Face**: `HuggingFace`
- **Perplexity**: `Perplexity`
- **Groq**: `Groq`
- **DeepSeek**: `DeepSeek`
- **Qwen/Tongyi**: `Qwen`, `Tongyi`
- **Baidu/Wenxin**: `Baidu`, `Wenxin`
- **Zhipu**: `Zhipu`
- **Moonshot**: `Moonshot`
- **Yi**: `Yi`
- And many more from `@lobehub/icons`

## Token Architecture

```
@nebutra/brand    → Brand primitives (color definitions, motion language)
@nebutra/tokens   → Runtime CSS variables (light/dark, 12-step scales)  ★ SOURCE OF TRUTH
@nebutra/theme    → Multi-theme presets (6 oklch variants for SaaS)
@nebutra/ui       → Component library (consumes tokens via CSS variables)
```

## License

AGPL-3.0 (inherits from Lobe UI)

> ⚠️ AI provider icons may be subject to their respective trademark guidelines.

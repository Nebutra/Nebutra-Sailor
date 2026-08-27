# @nebutra/preset

Scenario preset system — resolves which apps, features, and themes are active for a given Nebutra configuration.

## Design Intent

Nebutra is a multi-scenario SaaS starter. Rather than configuring each app, feature flag, and theme individually, operators declare a **preset** (e.g. `"ai-saas"`, `"marketing"`, `"one-person"`) and the preset system resolves the full activation map. Individual overrides can be layered on top of a preset via `defineConfig`.

This package has no runtime dependencies on any specific app or infrastructure package; it is a pure configuration-resolution layer consumed at build time and by infrastructure scripts.

## Usage

```typescript
import { defineConfig, resolveConfig } from "@nebutra/preset";

const config = defineConfig({ preset: "ai-saas", theme: "neon" });
const resolved = resolveConfig(config);
// resolved.features.ai === true
// resolved.apps.web === true
```

## Available Presets

`ai-saas` | `marketing` | `dashboard` | `overseas` | `growth` | `creative` | `blog-portfolio` | `community` | `one-person` | `full`

# @nebutra/captcha

> **Status: WIP** — Not yet integrated into any production app. Do not import until this notice is removed.

CAPTCHA integration using Cloudflare Turnstile.

## Setup

### 1. Get Turnstile Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Turnstile
2. Add a new site
3. Copy the **Site Key** (public) and **Secret Key** (server-side)

### 2. Environment Variables

```env
# Client-side (public)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAAA..."

# Server-side (secret)
TURNSTILE_SECRET_KEY="0x4AAAAB..."
```

## Usage

### React Component

```tsx
"use client";

import { useState } from "react";
import { Turnstile } from "@nebutra/captcha/react";

export function RegisterForm() {
  const [token, setToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("Please complete the CAPTCHA");
      return;
    }

    await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ ...formData, captchaToken: token }),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}

      <Turnstile
        onSuccess={setToken}
        onError={(error) => console.error(error)}
        onExpire={() => setToken(null)}
      />

      <button type="submit" disabled={!token}>
        Register
      </button>
    </form>
  );
}
```

### Server Middleware (Hono)

```ts
import { captchaMiddleware } from "@nebutra/captcha/server";

// Protect a route
app.post("/api/register", captchaMiddleware(), async (c) => {
  // CAPTCHA verified, proceed with registration
  const body = await c.req.json();
  // ...
});

// With options
app.post(
  "/api/contact",
  captchaMiddleware({
    expectedAction: "contact",
    skipInDev: true,
  }),
  async (c) => {
    // ...
  }
);
```

### Direct Verification

```ts
import { verifyTurnstile, isTurnstileValid } from "@nebutra/captcha/server";

// Full verification with details
const result = await verifyTurnstile({
  token: "...",
  ip: "1.2.3.4",
  expectedAction: "register",
});

if (!result.success) {
  console.error(result["error-codes"]);
}

// Simple boolean check
const isValid = await isTurnstileValid(token, ip);
```

## Props & Options

### Turnstile Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `siteKey` | `string` | env var | Site key (uses `NEXT_PUBLIC_TURNSTILE_SITE_KEY` if not provided) |
| `onSuccess` | `(token: string) => void` | - | Called when verification succeeds |
| `onError` | `(error: string) => void` | - | Called when verification fails |
| `onExpire` | `() => void` | - | Called when token expires |
| `theme` | `"light" \| "dark" \| "auto"` | `"auto"` | Widget theme |
| `size` | `"normal" \| "compact" \| "flexible"` | `"normal"` | Widget size |
| `action` | `string` | - | Action identifier for analytics |
| `appearance` | `"always" \| "execute" \| "interaction-only"` | `"always"` | When to show widget |

### Middleware Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tokenField` | `string` | `"captchaToken"` | Body field name for token |
| `tokenHeader` | `string` | `"x-captcha-token"` | Header name for token |
| `expectedAction` | `string` | - | Verify action matches |
| `skipInDev` | `boolean` | `false` | Skip in development |
| `onError` | `function` | - | Custom error handler |

## Recommended Protection Points

Apply CAPTCHA to:
- ✅ User registration
- ✅ Login (after failed attempts)
- ✅ Password reset
- ✅ Contact forms
- ✅ Content submission
- ✅ Public API endpoints

Don't apply to:
- ❌ Authenticated internal APIs
- ❌ High-frequency endpoints
- ❌ Webhook receivers
- ❌ Health check endpoints

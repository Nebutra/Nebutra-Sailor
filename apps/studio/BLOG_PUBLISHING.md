# Blog Publishing Runbook

Nebutra blog content is published through Sanity, then the landing page is
revalidated in place. A normal article publish should not require a Vercel
production build.

## Fast Path

1. Prepare one Markdown file per locale.
2. Publish each locale with `blog:publish`.
3. Open the returned URL and verify the language switch.

Keep source links in Markdown with normal `[label](https://...)` syntax. The
publisher preserves them as Portable Text link marks, so references should not
be rewritten as plain text during bilingual editing.

```bash
SANITY_API_TOKEN=... \
SANITY_WEBHOOK_SECRET=... \
pnpm --filter @nebutra/studio blog:publish -- \
  --file ./content/blog/why-we-build-nebutra.zh.md \
  --language zh \
  --slug why-we-build-nebutra-zh \
  --translation-key why-we-build-nebutra \
  --title "为什么我们要做 Nebutra" \
  --excerpt "关于 2026 年这个奇怪的时刻..." \
  --author "Tseka Luk" \
  --categories "Nebutra,Founder Notes"
```

English uses the same `translation-key` and a different slug:

```bash
SANITY_API_TOKEN=... \
SANITY_WEBHOOK_SECRET=... \
pnpm --filter @nebutra/studio blog:publish -- \
  --file ./content/blog/why-we-build-nebutra.en.md \
  --language en \
  --slug why-we-build-nebutra \
  --translation-key why-we-build-nebutra \
  --title "Why We Are Building Nebutra" \
  --excerpt "On the strange 2026 moment..." \
  --author "Tseka Luk" \
  --categories "Nebutra,Founder Notes"
```

## Markdown Frontmatter

CLI flags can be moved into frontmatter:

```markdown
---
title: Why We Are Building Nebutra
slug: why-we-build-nebutra
translationKey: why-we-build-nebutra
excerpt: On the strange 2026 moment...
author: Tseka Luk
categories: Nebutra,Founder Notes
publishedAt: 2026-05-16T00:00:00.000Z
---

# Why We Are Building Nebutra

...
```

CLI flags override frontmatter when both are present.

## Sanity Login Path

For local publishing, run these commands from `apps/studio`, where
`sanity.cli.ts` defines the project and dataset. Prefer a short-lived Sanity
token created from the current CLI login instead of storing a long-lived token
in the repo or shell profile.

```bash
pnpm dlx sanity@5.13.0 login

TOKEN_JSON="$(pnpm dlx sanity@5.13.0 tokens add "Local Blog Publisher $(date -u +%Y-%m-%dT%H:%M:%SZ)" --role=editor --json --yes)"
TOKEN_ID="$(TOKEN_JSON="$TOKEN_JSON" node -e 'console.log(JSON.parse(process.env.TOKEN_JSON).id)')"
SANITY_API_TOKEN="$(TOKEN_JSON="$TOKEN_JSON" node -e 'console.log(JSON.parse(process.env.TOKEN_JSON).key)')"

SANITY_API_TOKEN="$SANITY_API_TOKEN" \
pnpm --filter @nebutra/studio blog:publish -- \
  --file content/blog/example.zh.md \
  --language zh

pnpm dlx sanity@5.13.0 tokens delete "$TOKEN_ID" --yes
```

`SANITY_WEBHOOK_SECRET` is only required when production has the same secret
configured for `/api/blog/webhook`. If production has no webhook secret, the
publisher can revalidate without signing.

## Dry Run

Use dry-run before writing to Sanity:

```bash
pnpm --filter @nebutra/studio blog:publish -- \
  --file ./content/blog/draft.md \
  --language en \
  --slug draft \
  --translation-key draft \
  --dry-run
```

## Manual Revalidation

If an editor publishes directly inside Sanity Studio and the page looks stale,
run the GitHub Actions workflow `Blog Revalidate`, or call the webhook:

```bash
PAYLOAD='{"_type":"post","slug":{"current":"why-we-build-nebutra"},"language":"en"}'
SIGNATURE="$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -mac HMAC -macopt key:"$SANITY_WEBHOOK_SECRET" | awk '{print $2}')"

curl -sS -X POST https://nebutra.com/api/blog/webhook \
  -H "content-type: application/json" \
  -H "sanity-webhook-signature: $SIGNATURE" \
  --data "$PAYLOAD"
```

## CI/CD Rule

Content-only publishing should mutate Sanity documents and call
`/api/blog/webhook`. It should not change `apps/landing-page` code, shared
packages, or root workspace config, because those paths correctly trigger a full
Vercel production build.

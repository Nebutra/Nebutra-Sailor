---
name: one_pager
kind: play
version: 1.0.0
description: Build a brand-aware static landing page from BrandContext and a product description
inputs:
  brand_md: { type: file, path: company/BRAND.md, mime: text/markdown }
  product_desc: { type: string, max_length: 500 }
  cta_text: { type: string, max_length: 80 }
outputs:
  html: { type: file, path: company/landing/index.html, mime: text/html }
  theme: { type: file, path: company/landing/theme.css, mime: text/css }
  deploy_manifest: { type: file, path: company/landing/deploy.json, mime: application/json }
budget:
  duration_s: 60
  cost_usd: 0.5
required_skills:
  - content_store.write
  - content_store.read
  - code_execution.preview
sub_agents:
  - role: web_builder
    allowed_skills: [content_store.write, code_execution.preview]
depends_on_plays: []
---

## What this play does

Builds a single-page launch site from the current BrandContext.

The Play owns the site composition, theme assembly, preview handoff, and deploy
manifest. It does not own sandbox execution, deploy credentials, or the
BrandContext schema.

## Rules

- Read BrandContext first.
- Use brand colors and typography as the source of truth.
- Write generated files through content-store.
- Produce a deploy manifest, but require explicit deploy consent before any
  external provider call.

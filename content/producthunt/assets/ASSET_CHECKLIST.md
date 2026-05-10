# Product Hunt Asset Checklist

## Required Assets

### 1. Thumbnail (Required)

**Specs:**

- **Dimensions:** 240 x 240 px
- **Format:** PNG, JPG, or GIF
- **Max size:** 2MB

**Best Practices:**

- Use your logo or a recognizable icon
- High contrast, readable at small sizes
- No text (logo wordmark is OK)
- Consistent with brand colors

**Status:** ⬜ Not Started

**File:** `./thumbnail.png`

---

### 2. Gallery Images (Required, 3-8 images)

**Specs:**

- **Dimensions:** 1270 x 760 px (16:9 aspect ratio)
- **Format:** PNG, JPG, or GIF
- **Max size:** 3MB each

**Recommended Gallery Order:**

| #   | Image                     | Purpose                           | Status |
| --- | ------------------------- | --------------------------------- | ------ |
| 1   | Hero/Overview             | First impression, main value prop | ⬜     |
| 2   | Dashboard/UI              | Show the actual product           | ⬜     |
| 3   | Feature - Multi-tenant    | Key differentiator                | ⬜     |
| 4   | Feature - AI-native       | LLM/embedding integration         | ⬜     |
| 5   | Feature - Billing         | Stripe/monetization               | ⬜     |
| 6   | Architecture Diagram      | Technical credibility             | ⬜     |
| 7   | Code Preview              | Developer appeal                  | ⬜     |
| 8   | Testimonials/Social Proof | Trust building                    | ⬜     |

**Design Guidelines:**

- Consistent visual style across all images
- Use brand colors (from `packages/brand/`)
- Include brief text overlays for context
- Show actual product, not mockups
- Dark mode friendly

**Files:**

```
./gallery/
├── 01-hero.png
├── 02-dashboard.png
├── 03-multi-tenant.png
├── 04-ai-native.png
├── 05-billing.png
├── 06-architecture.png
├── 07-code-preview.png
└── 08-testimonials.png
```

---

### 3. Demo Video/GIF (Highly Recommended)

**Option A: Video**

- **Format:** YouTube or Vimeo link
- **Duration:** 1-3 minutes recommended
- **Content:** Product walkthrough, key features

**Option B: GIF**

- **Dimensions:** 1270 x 760 px
- **Duration:** 10-30 seconds
- **Max size:** 3MB

**Video Script Outline:**

1. Hook (5 sec): "Ship SaaS 10x faster"
2. Problem (15 sec): "AI makes demos easy, but real products are hard"
3. Solution (30 sec): Walkthrough of key features
4. Social proof (10 sec): Testimonials/stats
5. CTA (5 sec): "Try it today"

**Status:** ⬜ Not Started

---

### 4. Logo Variations

**Already Available in `packages/brand/assets/logo/`:**

- [ ] Verify `logo-horizontal-en.svg` works at small sizes
- [ ] Verify `logo-inverse.svg` for dark backgrounds
- [ ] Verify `logo-mono.svg` for single-color use

---

## Optional Assets

### 5. Maker Avatar

- Use a professional, friendly photo
- Consistent across PH profile and other social media

### 6. Open Graph Image (for sharing)

- **Dimensions:** 1200 x 630 px
- Used when PH link is shared on social media

**File:** `./og-image.png`

---

## Production Pipeline

### Tools Recommended

- **Design:** Figma, Canva
- **Screenshots:** CleanShot X, OBS
- **Video:** Loom, ScreenFlow, DaVinci Resolve
- **GIF:** Gifski, CloudConvert

### Asset Production Checklist

```
[ ] Create Figma template with PH dimensions
[ ] Export brand colors and fonts from design-system
[ ] Capture high-quality screenshots of:
    [ ] Landing page
    [ ] Dashboard
    [ ] Code editor with Nebutra code
    [ ] Terminal with commands running
[ ] Add text overlays and annotations
[ ] Export all images at correct dimensions
[ ] Compress images (TinyPNG, ImageOptim)
[ ] Test images on PH preview
[ ] Record demo video/GIF
[ ] Get team feedback
[ ] Final review and approval
```

---

## Image Specifications Summary

| Asset     | Dimensions | Format      | Max Size |
| --------- | ---------- | ----------- | -------- |
| Thumbnail | 240 x 240  | PNG/JPG/GIF | 2MB      |
| Gallery   | 1270 x 760 | PNG/JPG/GIF | 3MB      |
| GIF       | 1270 x 760 | GIF         | 3MB      |
| OG Image  | 1200 x 630 | PNG/JPG     | 2MB      |

---

## Brand Assets Reference

Location: `packages/brand/assets/`

```
packages/brand/assets/
├── logo/
│   ├── logo-horizontal-en.svg
│   ├── logo-inverse.svg
│   ├── logo-mono.svg
│   └── ...
├── icons/
│   ├── ai.svg
│   ├── tenants.svg
│   ├── enterprise.svg
│   └── ...
└── colors/
    └── palette.json
```

---

## Quality Checklist

Before submitting assets:

- [ ] All images are correct dimensions
- [ ] All images are under size limits
- [ ] Text is readable at expected display size
- [ ] Colors are consistent with brand
- [ ] No spelling/grammar errors in text overlays
- [ ] Images look good on both light/dark backgrounds
- [ ] Tested preview on Product Hunt
- [ ] Mobile-friendly (check on phone)

---

_Last updated: [DATE]_
_Owner: @TsekaLuk_

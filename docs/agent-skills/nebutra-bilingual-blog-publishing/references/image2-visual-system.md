# image2 Editorial Visual System

Use this reference when a Nebutra blog post needs a cover, social image, inline diagram, or visual refresh. The goal is not "make one pretty cover"; the goal is to design a coherent image set whose number, role, style, and placement are derived from the article.

## Hard Gate

Original Nebutra posts require at least one semantic cover image. The user providing no image assets is not a reason to skip image work; it means the agent must generate a Nebutra editorial cover. Skip cover generation only when the user explicitly asks for no cover, image generation/upload is unavailable, or the task is an update that does not touch visuals. Record that exception in the closeout.

## Image Count Heuristic

- **Short product update / announcement, under 1,200 words**: 1 cover.
- **Founder note / essay, 1,200-3,000 words**: 1 cover, optionally 1 pull-quote/social card.
- **Research report / framework / tutorial, 3,000+ words**: 1 cover plus 2-4 inline editorial graphics.
- **Comparison / review / teardown**: 1 cover plus 1 comparison plate or matrix visual.
- **Authorized repost**: use original media only if rights allow. Otherwise create a Nebutra editorial cover and optionally one explainer visual. Always preserve attribution.

## Image Roles

1. **Cover**
   - Aspect: 16:9 or 1200x630 social-safe composition.
   - Purpose: encode the central thesis in one editorial metaphor.
   - Placement: hero/card/OG source.
2. **Concept map**
   - Aspect: 4:3, 16:10, or tall responsive depending on complexity.
   - Purpose: show framework layers, taxonomy, ecosystem map, or named concepts.
   - Placement: after the section that introduces the framework.
3. **Process diagram**
   - Aspect: wide 16:9 or 21:9.
   - Purpose: show workflow stages, lifecycle, flywheel, or pipeline.
   - Placement: before operational sections.
4. **Comparison plate**
   - Aspect: 16:10 or 4:3.
   - Purpose: visually compare options, tradeoffs, or before/after.
   - Placement: near comparison tables.
5. **Pull-quote/social card**
   - Aspect: 1:1, 4:5, or 1200x630.
   - Purpose: distribution asset, not default article body art.

## Nebutra Visual Direction

Default style: modern flat editorial, AI SaaS, Swiss grid, warm off-white surfaces, restrained Nebutra blue/cyan accent, near-black text energy, subtle grain, clean geometry, and soft diffuse gradients only when they carry meaning.

Avoid:

- generic neon AI backgrounds
- random dashboards or fake UI chrome
- illegible generated text
- unrelated robots unless robotics is actually the topic
- hardcoded SVG as final creative
- stock-photo look
- dark blurry atmospheric art
- logos for third-party brands unless authorized or used as a tiny factual badge

## Required Meta-Prompt Before Generation

Write this plan before calling image generation. Keep it short but explicit.

```text
ARTICLE INTENT
- Article title:
- Language coverage:
- Content type: original / repost / research / tutorial / founder note / comparison / announcement
- Audience:
- Central thesis:
- Central tension:
- Named entities:
- Must preserve:
- Must avoid:

IMAGE SET
- Total images:
- Roles:
- Where each image appears:

GLOBAL ART DIRECTION
- Visual metaphor:
- Composition system:
- Color system:
- Typography mood:
- Iconography:
- Texture:
- Brand constraints:

IMAGE 1: <role>
- Aspect ratio:
- Semantic content:
- Information hierarchy:
- Composition:
- Palette:
- Alt text:
- Negative prompt:

IMAGE 2: <role>
...
```

## Candidate Generation Standard

- Generate at least 3 cover candidates when practical.
- Generate 2 candidates for important inline graphics when practical.
- Pick based on semantic fit first, visual polish second.
- Check desktop and mobile crop safety.
- Reject images with broken hands/text, unrelated symbolism, unreadable words, or generic "AI network" filler.
- Record final alt text and intended article placement.

## Prompt Template

```text
Create a Nebutra editorial blog <role> for an article titled "<title>".

Core argument: <one sentence thesis>.
Audience: <audience>.
Mood: <calm / rigorous / provocative / founder-led / technical / strategic>.

Visual concept:
<specific metaphor and objects, no generic AI filler>.

Style:
Modern flat editorial illustration, Swiss grid, high-end AI SaaS design, warm off-white background, near-black structural linework, restrained Nebutra blue/cyan accent, subtle diffuse gradient only as atmospheric depth, clean geometric composition, premium but not glossy, no fake UI screenshots unless requested, no stock-photo realism, no illegible text.

Composition:
<foreground/midground/background, focal point, safe margins, mobile crop behavior>.

Constraints:
No random robot unless explicitly relevant. No garbled text. No visible third-party logo unless factual and authorized. No dark blurry generic AI background. No hardcoded SVG style. The image must communicate <semantic purpose>.

Output:
<aspect ratio and target use>.
```

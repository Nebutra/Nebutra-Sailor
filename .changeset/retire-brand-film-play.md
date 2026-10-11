---
"@nebutra/brand-genesis": minor
---

Retire the `brand_film_60s` Play. Brand Genesis now runs the `brand_kit` Play
(BRAND.md, palette, logo/hero/icon, mesh, landing handoff) and no longer
renders a film, BGM, or narration. `BrandFilmInput` is renamed to
`BrandGenesisInput`; `founderVoiceId`, `storyboard`, `film`, `bgm`, and
`narration` are removed, and the video/audio/voice pipeline dependencies are
dropped.

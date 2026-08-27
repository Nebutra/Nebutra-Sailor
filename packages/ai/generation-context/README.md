# @nebutra/generation-context

Status: WIP — Not yet integrated into any production app.

`@nebutra/generation-context` is the single TypeScript owner for Layer 4
`BrandContext`, media license metadata, and generated asset provenance. The
file truth still lives in content-store as `company/BRAND.md`; this package
only defines the shared typed contract used by image, video, audio, voice, and
3D capability packages.

It does not generate media, route providers, or own prompts.

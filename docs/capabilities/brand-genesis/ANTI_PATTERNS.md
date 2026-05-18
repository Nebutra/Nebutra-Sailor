# brand-genesis Anti-Patterns

## Owning Media Generation

Do not add image, video, audio, voice, or mesh providers here. This package
delegates to the generation-capability packages and only sequences the Play.

## Creating Another BrandContext

Use `@nebutra/generation-context`. A second brand schema would break cross-modal
consistency across Layer 4.

## Skipping Brand Materialization

`company/BRAND.md` must be written before any downstream generation call. It is
the source of truth for the whole Play.

## Free-Form Prompt Islands

The Play declaration lives in SKILL.md. Keep orchestration and checkpoints in
that format instead of scattering one-off prompt templates across the package.

## Pretending Landing Builder Exists

Until `landing-builder` is implemented, write a landing handoff manifest. Do
not hide that gap by embedding a full site generator in this package.

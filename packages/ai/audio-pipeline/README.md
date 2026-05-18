# @nebutra/audio-pipeline

Status: WIP — Not yet integrated into any production app.

`@nebutra/audio-pipeline` is the BrandContext-first audio capability surface.
The zero-config path writes short valid WAV files with license metadata so
doctor, debug, and examples are executable without model credentials.

It does not own prompt orchestration, Thread/Turn/Item state, model provider
routing, or approval lifecycle.

## Commands

```bash
pnpm audio:doctor
pnpm audio:debug
pnpm audio:license <asset>
pnpm audio:loudness <asset>
```

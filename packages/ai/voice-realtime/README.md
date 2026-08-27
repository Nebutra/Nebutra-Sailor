# @nebutra/voice-realtime

Status: WIP — Not yet integrated into any production app.

`@nebutra/voice-realtime` owns voice session lifecycle, narration synthesis,
interrupt metadata, and voice enrollment contracts. The zero-config path writes
valid narration WAV files through audio utilities; realtime WebRTC/STT/TTS is a
sidecar port.

It does not own Thread/Turn/Item state, model provider routing, or prompt
orchestration.

## Commands

```bash
pnpm voice:doctor
pnpm voice:debug
pnpm voice:enroll
pnpm voice:test-mic
```

# voice-realtime Anti-Patterns

- Do not process WebRTC inside the runtime process.
- Do not record or upload audio without explicit consent.
- Do not treat voice sessions as state owners; they are thread-bound views.
- Do not skip sentence-level chunking in production TTS adapters.

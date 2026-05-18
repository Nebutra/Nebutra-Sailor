# voice-realtime Replication Guide

```ts
import { createDemoBrandContext } from "@nebutra/generation-context";
import { VoiceRealtime } from "@nebutra/voice-realtime";

const voice = new VoiceRealtime();
const session = await voice.startSession({ tenantId: "demo", threadId: "thread_1" });
const narration = await voice.synthesizeNarration(
  { script: "Loop makes debugging visible.", targetDurationS: 3 },
  createDemoBrandContext(),
);
console.log(session.room, narration.path);
```

## Steps

1. Start a thread-bound voice session.
2. Generate or enroll a voice profile.
3. Synthesize narration with `BrandContext`.
4. Run `pnpm voice:doctor` before realtime transport.

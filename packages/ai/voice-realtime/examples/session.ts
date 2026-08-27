import { VoiceRealtime } from "../src/index";

process.stdout.write(
  `${JSON.stringify(await new VoiceRealtime().startSession({ tenantId: "demo", threadId: "thread_1" }), null, 2)}\n`,
);

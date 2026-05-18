import { VoiceRealtime } from "../src/index";

const profile = await new VoiceRealtime().enroll({ tenantId: "demo", samplePaths: [] });

process.stdout.write(`${profile.id}\n`);

import { CofounderMatch, readCofounderMatchDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const root = process.env.COFOUNDER_MATCH_ROOT ?? ".nebutra/cofounder-match";
const tenantId = process.env.NEBUTRA_TENANT_ID ?? "local";

if (command === "doctor") {
  const match = await CofounderMatch.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await match.doctor(), null, 2)}\n`);
  } finally {
    await match.close();
  }
} else if (command === "quickstart") {
  const match = await CofounderMatch.open(root, { tenantId });
  try {
    const profile = await match.buildProfileFromActivity({
      founderId: "alice",
      activeDays: 31,
      playCounts: { code: 20, growth: 2, brand: 4, support: 1 },
      domainTags: ["developer-tools"],
      communicationSamples: ["direct technical updates"],
    });
    process.stdout.write(`${JSON.stringify(profile, null, 2)}\n`);
  } finally {
    await match.close();
  }
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "cofounder-match", entries: await readCofounderMatchDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown cofounder-match command: ${command}\n`);
  process.exitCode = 1;
}

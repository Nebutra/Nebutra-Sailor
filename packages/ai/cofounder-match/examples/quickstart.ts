import { CofounderMatch } from "../src/index";

const match = await CofounderMatch.open(".nebutra/cofounder-match-example", {
  tenantId: "local",
});

try {
  const profile = await match.buildProfileFromActivity({
    founderId: "alice",
    activeDays: 31,
    playCounts: { code: 40, growth: 3, brand: 8, support: 2 },
    domainTags: ["developer-tools"],
    communicationSamples: ["direct technical updates"],
  });
  process.stdout.write(`${JSON.stringify(profile, null, 2)}\n`);
} finally {
  await match.close();
}

import { CofounderMatch } from "../src/index";

const match = await CofounderMatch.open(".nebutra/cofounder-match-consent-example", {
  tenantId: "local",
});

try {
  await match.expressInterest("alice", "sarah");
  await match.expressInterest("sarah", "alice");
  process.stdout.write(`${JSON.stringify(await match.startChat("alice", "sarah"), null, 2)}\n`);
} finally {
  await match.close();
}

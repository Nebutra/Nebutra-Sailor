import { CofounderMatch } from "../src/index";

const match = await CofounderMatch.open(".nebutra/cofounder-match-example", {
  tenantId: "local",
});

try {
  process.stdout.write(`${JSON.stringify(await match.doctor(), null, 2)}\n`);
} finally {
  await match.close();
}

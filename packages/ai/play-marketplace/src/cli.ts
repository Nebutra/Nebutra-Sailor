import { PlayMarketplace, readPlayMarketplaceDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const root = process.env.PLAY_MARKETPLACE_ROOT ?? ".nebutra/play-marketplace";
const tenantId = process.env.NEBUTRA_TENANT_ID ?? "local";

if (command === "doctor") {
  const marketplace = await PlayMarketplace.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await marketplace.doctor(), null, 2)}\n`);
  } finally {
    await marketplace.close();
  }
} else if (command === "quickstart") {
  const marketplace = await PlayMarketplace.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await marketplace.doctor(), null, 2)}\n`);
  } finally {
    await marketplace.close();
  }
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "play-marketplace", entries: await readPlayMarketplaceDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown play-marketplace command: ${command}\n`);
  process.exitCode = 1;
}

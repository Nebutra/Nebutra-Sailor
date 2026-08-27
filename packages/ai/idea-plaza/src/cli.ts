import { IdeaPlaza, readIdeaPlazaDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const root = process.env.IDEA_PLAZA_ROOT ?? ".nebutra/idea-plaza";
const tenantId = process.env.NEBUTRA_TENANT_ID ?? "local";

if (command === "doctor") {
  const plaza = await IdeaPlaza.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await plaza.doctor(), null, 2)}\n`);
  } finally {
    await plaza.close();
  }
} else if (command === "quickstart") {
  const plaza = await IdeaPlaza.open(root, { tenantId });
  try {
    const idea = await plaza.publish({
      title: "Loop",
      oneLine: "AI debugging for indie devs",
      level: "surface",
      tags: ["debugging", "developer-tools"],
    });
    process.stdout.write(
      `${JSON.stringify({ idea, feed: await plaza.feed({ sort: "hot", limit: 5 }) }, null, 2)}\n`,
    );
  } finally {
    await plaza.close();
  }
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "idea-plaza", entries: await readIdeaPlazaDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown idea-plaza command: ${command}\n`);
  process.exitCode = 1;
}

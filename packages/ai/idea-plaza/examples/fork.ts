import { IdeaPlaza } from "../src/index";

const plaza = await IdeaPlaza.open(".nebutra/idea-plaza-fork-example", { tenantId: "local" });

try {
  const idea = await plaza.publish({
    title: "Loop",
    oneLine: "AI debugging for indie devs",
    level: "cloneable",
    tags: ["debugging"],
  });
  const fork = await plaza.fork(idea.ideaId, {
    newFounderId: "bob",
    inheritPlayPreferences: true,
  });
  process.stdout.write(`${JSON.stringify(fork, null, 2)}\n`);
} finally {
  await plaza.close();
}

import { IdeaPlaza } from "../src/index";

const plaza = await IdeaPlaza.open(".nebutra/idea-plaza-example", { tenantId: "local" });

try {
  const idea = await plaza.publish({
    title: "Loop",
    oneLine: "AI debugging for indie devs",
    level: "surface",
    body: "A developer tool that explains stack traces as a conversation.",
    tags: ["debugging", "developer-tools"],
  });
  process.stdout.write(`${JSON.stringify(idea, null, 2)}\n`);
} finally {
  await plaza.close();
}

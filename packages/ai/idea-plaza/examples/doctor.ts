import { IdeaPlaza } from "../src/index";

const plaza = await IdeaPlaza.open(".nebutra/idea-plaza-example", { tenantId: "local" });

try {
  process.stdout.write(`${JSON.stringify(await plaza.doctor(), null, 2)}\n`);
} finally {
  await plaza.close();
}

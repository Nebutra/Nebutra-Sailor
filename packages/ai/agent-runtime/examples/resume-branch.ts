import { InMemoryRolloutStore, Pulsar, ToolRegistry } from "../src";

const eventLog = {
  async commit() {
    return "event_1";
  },
  async branchFrom(id: string, name: string) {
    return { name, from: id, at: new Date().toISOString() };
  },
};

const pulsar = Pulsar.builder()
  .withTenant("local")
  .withConfig({
    model: "local",
    provider: "injected",
    approvalPolicy: "on_request",
    capabilityPolicy: "external_sandbox",
  })
  .withModel({
    async invoke() {
      return { emissions: [{ kind: "text", text: "branch me" }] };
    },
  })
  .withTools(new ToolRegistry())
  .withRolloutStore(new InMemoryRolloutStore())
  .withApprovalGate({
    async request() {
      return { kind: "approved" };
    },
  })
  .withEventLog(eventLog)
  .build();

const thread = await pulsar.startPlay("branch_play", "Run once");
let itemId = "";
for await (const event of thread.subscribe()) {
  if (event.type === "item.completed") itemId = event.item.id;
}

const resumed = await pulsar.resume(thread.id);
process.stdout.write(`${JSON.stringify({ resumed: resumed.id })}\n`);
process.stdout.write(
  `${JSON.stringify(await pulsar.branchFromItem(thread.id, itemId, "variant"))}\n`,
);

import { z } from "zod";
import { InMemoryRolloutStore, Pulsar, ToolRegistry } from "../src";

const tools = new ToolRegistry();
tools.register(
  { name: "echo", description: "Echo a value", inputSchema: z.object({ value: z.string() }) },
  async (input: { value: string }) => input.value,
);

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
      return { emissions: [{ kind: "text", text: "hello from Pulsar" }] };
    },
  })
  .withTools(tools)
  .withRolloutStore(new InMemoryRolloutStore())
  .withApprovalGate({
    async request() {
      return { kind: "approved" };
    },
  })
  .build();

const thread = await pulsar.startPlay("hello_play", "Say hello");
for await (const event of thread.subscribe()) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

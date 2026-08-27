import { BrowserControl, JsonBrowserRecorder } from "@nebutra/browser-control";

const browser = new BrowserControl({
  tenantId: "local",
  recorder: new JsonBrowserRecorder(),
  explorer: {
    async runTask(task) {
      return {
        sessionId: "first_run_example",
        strategy: "explore",
        output: { objective: task.objective, captured: true },
        actions: [{ type: "extract", instruction: task.objective, value: { captured: true } }],
      };
    },
    async doctor() {
      return { provider: "first_run", ok: true };
    },
  },
});

const result = await browser.task({
  tenantId: "local",
  objective: "Capture the visible account name",
  startUrl: "https://example.com",
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

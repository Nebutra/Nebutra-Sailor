import { BrowserControl, JsonBrowserRecorder } from "@nebutra/browser-control";

const recorder = new JsonBrowserRecorder();
await recorder.save({
  tenantId: "local",
  sessionId: "checkout_flow",
  taskId: "checkout",
  strategy: "explore",
  createdAt: new Date().toISOString(),
  actions: [{ type: "act", instruction: "click checkout", selector: "#checkout" }],
});

const browser = BrowserControl.local({ tenantId: "local", recorder });
process.stdout.write(`${JSON.stringify(await browser.replay("checkout_flow"), null, 2)}\n`);

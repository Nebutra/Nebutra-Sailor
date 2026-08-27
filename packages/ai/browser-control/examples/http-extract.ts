import { BrowserControl } from "@nebutra/browser-control";

const browser = BrowserControl.local({ tenantId: "local" });
const result = await browser.task({
  tenantId: "local",
  objective: "Extract visible text and links",
  startUrl: "https://example.com",
  prefer: "deterministic",
});

process.stdout.write(`${JSON.stringify(result.output, null, 2)}\n`);

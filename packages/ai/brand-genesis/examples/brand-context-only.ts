import { brandContextFromDraft, distillBrandIdea, renderBrandMarkdown } from "../src";

const draft = distillBrandIdea({
  idea: "Customer support copilot for solo founders called Harbor",
  visualDirectionHint: "minimal",
});
const brand = brandContextFromDraft(draft, "tenant_demo");

process.stdout.write(renderBrandMarkdown(draft, brand));

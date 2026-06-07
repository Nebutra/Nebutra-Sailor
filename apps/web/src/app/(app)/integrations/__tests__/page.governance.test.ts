import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The dashboard Home converged into Startup OS (merge); its DocumentPipeline
// (DocumentTaskUploader) was rehomed onto the Connectors/Integrations surface,
// reusing the existing dashboard.documentPipeline.* i18n keys.
const INTEGRATIONS_PAGE = join(process.cwd(), "src/app/(app)/integrations/page.tsx");

describe("@nebutra/web integrations document-pipeline rehoming", () => {
  const source = readFileSync(INTEGRATIONS_PAGE, "utf8");

  it("renders the rehomed document task uploader", () => {
    expect(source).toContain("DocumentTaskUploader");
    expect(source).toContain("DocumentPipelineSection");
    expect(source).toContain("<DocumentPipelineSection />");
  });

  it("reuses the existing dashboard.documentPipeline i18n namespace", () => {
    expect(source).toContain('useTranslations("dashboard.documentPipeline")');
    expect(source).toContain("intakeTitle: t(");
    expect(source).toContain("updatedAt: t(");
  });

  it("wraps the pipeline in the shared DashboardPanel pattern", () => {
    expect(source).toContain('from "@nebutra/ui/patterns"');
    expect(source).toContain("DashboardPanel");
  });
});

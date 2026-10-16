import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The Vite product app resolves `next-intl` to this module (vite.config.ts).
// Render the shared billing components through it, the way /billing does.
vi.mock("next-intl", async () => await import("@/vite-app/next-compat/intl"));

import {
  ActivePlanCard,
  BillingProviderNotice,
  buildBillingSelfServiceModel,
  PlanChoiceGrid,
} from "@/components/billing/billing-self-service";
import * as compat from "@/vite-app/next-compat/intl";

const appRoot = path.resolve(__dirname, "../../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return name === "node_modules" || name === "__tests__" ? [] : sourceFiles(full);
    }
    return /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name) ? [full] : [];
  });
}

describe("next-intl compat for the Vite product app", () => {
  it("serves catalog messages and the translator methods shared components call", () => {
    const tp = compat.useTranslations("copy.billingPlans");
    expect(tp("free.name")).toBe("Free");
    expect(Array.isArray(tp.raw("free.features"))).toBe(true);
    expect(typeof tp.rich).toBe("function");
    expect(typeof tp.markup).toBe("function");
    expect(tp.has("free.name")).toBe(true);
    // A missing key renders its path rather than throwing.
    expect(compat.useTranslations("copy")("no.such.key")).toBe("copy.no.such.key");
  });

  it("formats relative time with next-intl's signature (a date, not a number and unit)", () => {
    const format = compat.useFormatter();
    const label = format.relativeTime(new Date(Date.now() - 3 * 60_000), new Date());
    expect(label).toBe("3 minutes ago");
  });

  it("renders the /billing route's components (regression: tp.raw is not a function)", () => {
    const model = buildBillingSelfServiceModel({ currentPlan: "FREE", env: {} });
    const html = renderToStaticMarkup(
      <>
        <BillingProviderNotice model={model} />
        <ActivePlanCard model={model} />
        <PlanChoiceGrid plans={model.plans} />
      </>,
    );
    expect(html).toContain("Active plan");
    expect(html).toContain("1 project");
    expect(html).not.toContain("copy.billingPlans");
  });

  it("covers every name the app imports from next-intl and every translator method it calls", () => {
    const files = sourceFiles(path.join(appRoot, "src"));
    const imported = new Set<string>();
    const methods = new Set<string>();
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']next-intl["']/g)) {
        for (const name of (match[1] ?? "").split(",")) {
          const clean = name
            .replace(/^\s*type\s+/, "")
            .trim()
            .split(/\s+as\s+/)[0];
          if (clean && !/^type\b/.test(name.trim())) imported.add(clean);
        }
      }
      if (/from\s*["']next-intl["']/.test(text)) {
        for (const match of text.matchAll(/\bt[A-Za-z0-9]*\.(raw|rich|markup|has)\(/g)) {
          methods.add(match[1] as string);
        }
      }
    }
    const exported = new Set(Object.keys(compat));
    for (const name of imported) {
      expect(exported.has(name), `next-compat/intl.ts must export ${name}`).toBe(true);
    }
    const t = compat.useTranslations();
    for (const method of methods) {
      expect(typeof (t as unknown as Record<string, unknown>)[method], `t.${method}`).toBe(
        "function",
      );
    }
  });
});

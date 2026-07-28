"use client";

import { Button, Input, Select } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  ConfigureGenerateShell,
  ShellBadge,
  ShellCode,
  ShellDrill,
  ShellNote,
} from "@/components/journey-shells";

/* The roster the tool ships with: current search crawlers plus the 2026 AI
   crawlers. Deliberately no dead 2010s engines — see the brief §9.4. */
const SEARCH_AGENTS = [
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "Baiduspider",
  "YandexBot",
  "DuckDuckBot",
] as const;

const AI_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "PerplexityBot",
  "CCBot",
  "Applebot-Extended",
  "Bytespider",
  "Amazonbot",
] as const;

type Access = "default" | "allow" | "disallow";
type RuleType = "allow" | "disallow";

interface RuleRow {
  id: string;
  path: string;
  type: RuleType;
}

interface SitemapRow {
  id: string;
  url: string;
}

interface RobotsWarning {
  code: string;
  severity: "info" | "warning";
  message: string;
  subject?: string;
}

interface RobotsGroup {
  userAgents: string[];
  directives: string[];
}

interface RobotsOutput {
  content: string;
  filename: string;
  lineCount: number;
  byteLength: number;
  groups: RobotsGroup[];
  sitemaps: string[];
  warnings: RobotsWarning[];
}

const ABSOLUTE_URL = /^https?:\/\/\S+$/i;

export function W3RobotsTxtGeneratorRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const uid = useId();

  const [defaultAccess, setDefaultAccess] = useState<"allow" | "disallow">("allow");
  const [crawlDelay, setCrawlDelay] = useState("");
  const [access, setAccess] = useState<Record<string, Access>>({});
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [sitemaps, setSitemaps] = useState<SitemapRow[]>([]);
  const seq = useRef(0);

  const nextId = useCallback(() => {
    seq.current += 1;
    return `${uid}-${seq.current}`;
  }, [uid]);

  const setAgent = useCallback((name: string, value: Access) => {
    setAccess((prev) => ({ ...prev, [name]: value }));
  }, []);

  const input = useMemo(() => {
    const delay = Number(crawlDelay.trim());
    const bots = Object.entries(access)
      .filter(([, value]) => value !== "default")
      .map(([name, value]) => ({ name, access: value }));
    const payload: Record<string, unknown> = {
      defaultAccess,
      bots,
      rules: rules
        .filter((rule) => rule.path.trim().length > 0)
        .map((rule) => ({ path: rule.path.trim(), type: rule.type })),
      // Half-typed URLs are not an error state — they simply do not participate
      // until they are absolute, so the panel never blanks mid-keystroke.
      sitemaps: sitemaps.map((row) => row.url.trim()).filter((url) => ABSOLUTE_URL.test(url)),
    };
    if (crawlDelay.trim() !== "" && Number.isFinite(delay) && delay >= 0.1 && delay <= 3600) {
      payload.crawlDelay = delay;
    }
    return payload;
  }, [defaultAccess, crawlDelay, access, rules, sitemaps]);

  const accessOptions = useMemo(
    () => [
      { value: "default", label: t("robotsTxt.accessDefault") },
      { value: "allow", label: t("robotsTxt.accessAllow") },
      { value: "disallow", label: t("robotsTxt.accessDisallow") },
    ],
    [t],
  );

  const renderAgentRow = (name: string) => (
    <div key={name} className="flex items-center justify-between gap-3">
      <span className="font-mono text-sm text-[var(--neutral-12)]">{name}</span>
      <Select
        value={access[name] ?? "default"}
        onValueChange={(value) => setAgent(name, (value as Access) ?? "default")}
        options={accessOptions}
        size="small"
        aria-label={name}
      />
    </div>
  );

  return (
    <ConfigureGenerateShell<RobotsOutput>
      engine={{ toolId, parse: (output) => output as unknown as RobotsOutput }}
      input={input}
      emptyHint={t("robotsTxt.emptyHint")}
      note={t("robotsTxt.deployNote")}
      exit={(output) => ({
        text: output.content,
        json: output,
        filename: "robots.txt",
        mimeType: "text/plain;charset=utf-8",
      })}
      renderResult={(output) => (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <ShellBadge tone="info">
              {t("robotsTxt.groupCount", { n: output.groups.length })}
            </ShellBadge>
            <ShellBadge>{t("robotsTxt.lineCount", { n: output.lineCount })}</ShellBadge>
            {output.sitemaps.length > 0 ? (
              <ShellBadge>{t("robotsTxt.sitemapCount", { n: output.sitemaps.length })}</ShellBadge>
            ) : null}
          </div>

          <ShellCode label={t("robotsTxt.outputLabel")}>{output.content}</ShellCode>

          {output.warnings.length > 0 ? (
            <ShellDrill
              summary={t("robotsTxt.warningsSummary", { n: output.warnings.length })}
              defaultOpen={output.warnings.some((w) => w.severity === "warning")}
            >
              <ul className="space-y-2">
                {output.warnings.map((warning) => (
                  <li key={warning.code + (warning.subject ?? "")} className="flex flex-col gap-1">
                    <ShellBadge tone={warning.severity === "warning" ? "warning" : "neutral"}>
                      {warning.code}
                    </ShellBadge>
                    <span className="text-sm text-[var(--neutral-11)]">{warning.message}</span>
                  </li>
                ))}
              </ul>
            </ShellDrill>
          ) : null}
        </div>
      )}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Select
              label={t("robotsTxt.defaultAccess")}
              value={defaultAccess}
              onValueChange={(value) =>
                setDefaultAccess(value === "disallow" ? "disallow" : "allow")
              }
              options={[
                { value: "allow", label: t("robotsTxt.defaultAllow") },
                { value: "disallow", label: t("robotsTxt.defaultDisallow") },
              ]}
            />
            <ShellNote>{t("robotsTxt.defaultAccessNote")}</ShellNote>
          </div>

          <div className="space-y-1">
            <Input
              id={`${uid}-delay`}
              label={t("robotsTxt.crawlDelay")}
              type="number"
              inputMode="decimal"
              min={0.1}
              max={3600}
              step={0.1}
              value={crawlDelay}
              placeholder={t("robotsTxt.crawlDelayPlaceholder")}
              onValueChange={setCrawlDelay}
            />
            <ShellNote>{t("robotsTxt.crawlDelayNote")}</ShellNote>
          </div>
        </div>

        <section className="space-y-2" aria-label={t("robotsTxt.searchAgents")}>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">
            {t("robotsTxt.searchAgents")}
          </h3>
          <div className="space-y-2">{SEARCH_AGENTS.map(renderAgentRow)}</div>
        </section>

        <section className="space-y-2" aria-label={t("robotsTxt.aiAgents")}>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">
            {t("robotsTxt.aiAgents")}
          </h3>
          <ShellNote>{t("robotsTxt.aiAgentsNote")}</ShellNote>
          <div className="space-y-2">{AI_AGENTS.map(renderAgentRow)}</div>
        </section>

        <section className="space-y-2" aria-label={t("robotsTxt.rules")}>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("robotsTxt.rules")}</h3>
          <ShellNote>{t("robotsTxt.rulesNote")}</ShellNote>
          {rules.map((rule, index) => (
            <div key={rule.id} className="flex flex-wrap items-end gap-2">
              <Input
                id={`${rule.id}-path`}
                label={t("robotsTxt.rulePath", { n: index + 1 })}
                value={rule.path}
                placeholder={t("robotsTxt.rulePathPlaceholder")}
                wrapperClassName="min-w-[16rem] flex-1"
                onValueChange={(value) =>
                  setRules((prev) =>
                    prev.map((row) => (row.id === rule.id ? { ...row, path: value } : row)),
                  )
                }
              />
              <Select
                value={rule.type}
                onValueChange={(value) =>
                  setRules((prev) =>
                    prev.map((row) =>
                      row.id === rule.id
                        ? { ...row, type: value === "allow" ? "allow" : "disallow" }
                        : row,
                    ),
                  )
                }
                options={[
                  { value: "disallow", label: t("robotsTxt.accessDisallow") },
                  { value: "allow", label: t("robotsTxt.accessAllow") },
                ]}
                aria-label={t("robotsTxt.ruleType")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRules((prev) => prev.filter((row) => row.id !== rule.id))}
              >
                {t("robotsTxt.removeRule")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setRules((prev) => [...prev, { id: nextId(), path: "", type: "disallow" }])
            }
          >
            {t("robotsTxt.addRule")}
          </Button>
        </section>

        <section className="space-y-2" aria-label={t("robotsTxt.sitemaps")}>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">
            {t("robotsTxt.sitemaps")}
          </h3>
          <ShellNote>{t("robotsTxt.sitemapsNote")}</ShellNote>
          {sitemaps.map((row, index) => (
            <div key={row.id} className="flex flex-wrap items-end gap-2">
              <Input
                id={`${row.id}-url`}
                label={t("robotsTxt.sitemapUrl", { n: index + 1 })}
                type="url"
                inputMode="url"
                value={row.url}
                placeholder="https://example.com/sitemap.xml"
                wrapperClassName="min-w-[18rem] flex-1"
                onValueChange={(value) =>
                  setSitemaps((prev) =>
                    prev.map((item) => (item.id === row.id ? { ...item, url: value } : item)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSitemaps((prev) => prev.filter((item) => item.id !== row.id))}
              >
                {t("robotsTxt.removeSitemap")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSitemaps((prev) => [...prev, { id: nextId(), url: "" }])}
          >
            {t("robotsTxt.addSitemap")}
          </Button>
        </section>
      </div>
    </ConfigureGenerateShell>
  );
}

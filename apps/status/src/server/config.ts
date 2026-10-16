/**
 * Configuration as code, in the lineage of Gatus's YAML config: a
 * `status.config.json` checked into the operator's repo declares
 * the page, its groups, components and monitors; the instance applies it on
 * start. Incidents, evidence and subscribers are runtime data and never live
 * in the file.
 *
 * Applying is idempotent and keyed by stable keys: renaming a component in the
 * file renames it in place and keeps its history. A component removed from
 * the file is removed with its history — the file is the source of truth.
 */
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { StatusDb } from "./db";

const key = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "keys are lower-case letters, digits, - and _");
const i18n = z.record(z.string().min(2).max(16), z.string().min(1).max(200));

const monitorSchema = z.object({
  kind: z.enum(["http", "keyword", "json_status", "statuspage"]).default("http"),
  coverage: z
    .enum(["dependency", "synthetic", "device", "upstream", "manual"])
    .default("dependency"),
  url: z.string().url(),
  method: z.enum(["GET", "HEAD"]).default("GET"),
  expectStatus: z.tuple([z.number().int(), z.number().int()]).default([200, 399]),
  keyword: z.string().min(1).max(200).optional(),
  timeoutMs: z.number().int().min(100).max(60_000).default(5000),
  intervalSeconds: z.number().int().min(10).max(86_400).default(60),
});

const componentSchema = z.object({
  key,
  name: z.string().min(1).max(120),
  nameI18n: i18n.optional(),
  description: z.string().max(500).optional(),
  group: key.optional(),
  public: z.boolean().default(true),
  monitors: z.array(monitorSchema).max(20).default([]),
});

export const statusConfigSchema = z.object({
  $schema: z.string().optional(),
  workspace: z.object({ slug: key, name: z.string().min(1).max(120) }),
  page: z.object({
    slug: key,
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    locales: z.array(z.string().min(2).max(16)).min(1).default(["en"]),
    compatProfile: z.enum(["xiaoya-v1"]).optional(),
  }),
  groups: z
    .array(
      z.object({
        key,
        name: z.string().min(1).max(120),
        nameI18n: i18n.optional(),
        description: z.string().max(500).optional(),
      }),
    )
    .default([]),
  components: z.array(componentSchema).min(1).max(500),
});

export type StatusConfig = z.input<typeof statusConfigSchema>;

export class ConfigError extends Error {}

export async function applyConfig(db: StatusDb, raw: StatusConfig) {
  const config = statusConfigSchema.parse(raw);
  const groupKeys = new Set(config.groups.map((g) => g.key));
  for (const c of config.components) {
    if (c.group && !groupKeys.has(c.group)) {
      throw new ConfigError(`Component ${c.key} names unknown group ${c.group}`);
    }
  }
  const dupes = config.components.map((c) => c.key).filter((k, i, all) => all.indexOf(k) !== i);
  if (dupes.length > 0) throw new ConfigError(`Duplicate component keys: ${dupes.join(", ")}`);

  return db.$transaction(async (tx) => {
    const workspace = await tx.workspace.upsert({
      where: { slug: config.workspace.slug },
      create: config.workspace,
      update: { name: config.workspace.name },
    });
    const pageData = {
      title: config.page.title,
      description: config.page.description ?? null,
      locales: config.page.locales,
      compatProfile: config.page.compatProfile ?? null,
    };
    const page = await tx.page.upsert({
      where: { slug: config.page.slug },
      create: { workspaceId: workspace.id, slug: config.page.slug, ...pageData },
      update: pageData,
    });

    const groupIds = new Map<string, string>();
    for (const [position, g] of config.groups.entries()) {
      const data = {
        name: g.name,
        nameI18n: g.nameI18n ?? Prisma.DbNull,
        description: g.description ?? null,
        position,
      };
      const row = await tx.componentGroup.upsert({
        where: { pageId_key: { pageId: page.id, key: g.key } },
        create: { workspaceId: workspace.id, pageId: page.id, key: g.key, ...data },
        update: data,
      });
      groupIds.set(g.key, row.id);
    }

    for (const [position, c] of config.components.entries()) {
      const data = {
        name: c.name,
        nameI18n: c.nameI18n ?? Prisma.DbNull,
        description: c.description ?? null,
        groupId: c.group ? (groupIds.get(c.group) ?? null) : null,
        isPublic: c.public,
        position,
      };
      const component = await tx.component.upsert({
        where: { pageId_key: { pageId: page.id, key: c.key } },
        create: { workspaceId: workspace.id, pageId: page.id, key: c.key, ...data },
        update: data,
      });
      // Monitors have no stable key of their own, so they are replaced with the
      // file's list; their evidence rows are keyed by monitor id and go too.
      const existing = await tx.monitor.findMany({
        where: { componentId: component.id },
        select: { id: true },
      });
      await tx.evidence.deleteMany({
        where: {
          componentId: component.id,
          source: { in: existing.map((m) => `monitor:${m.id}`) },
        },
      });
      await tx.monitor.deleteMany({ where: { componentId: component.id } });
      for (const m of c.monitors) {
        await tx.monitor.create({
          data: {
            workspaceId: workspace.id,
            componentId: component.id,
            kind: m.kind,
            coverage: m.coverage,
            url: m.url,
            method: m.method,
            expectStatusMin: m.expectStatus[0],
            expectStatusMax: m.expectStatus[1],
            keyword: m.keyword ?? null,
            timeoutMs: m.timeoutMs,
            intervalSeconds: m.intervalSeconds,
          },
        });
      }
    }

    await tx.component.deleteMany({
      where: { pageId: page.id, key: { notIn: config.components.map((c) => c.key) } },
    });
    await tx.componentGroup.deleteMany({
      where: { pageId: page.id, key: { notIn: config.groups.map((g) => g.key) } },
    });
    return { workspace, page };
  });
}

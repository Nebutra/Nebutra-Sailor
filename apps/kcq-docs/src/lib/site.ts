import { brand } from "@nebutra/brand/metadata";
import facts from "@/generated/facts.json";

export const KCQ_ORIGIN = `https://${brand.domains.kcq}`;
export const APP_PATH = "/app";
export const FACTS = facts;

/** The Sailor repository that hosts the hand-written pages (apps/kcq-docs/content). */
export const SAILOR_REPOSITORY = `${brand.social.github}/${brand.name}-Sailor`;

export const LINKS = {
  github: facts.upstream,
  fork: facts.repository,
  npm: "https://www.npmjs.com/package/@363045841yyt/klinechart",
  commit: `${facts.repository}/commit/${facts.commit}`,
  blob: (file: string) => `${facts.repository}/blob/${facts.commit}/${file}`,
  editSource: (file: string) => `${facts.repository}/edit/main/${file}`,
  editDocs: (file: string) => `${SAILOR_REPOSITORY}/edit/main/${file}`,
} as const;

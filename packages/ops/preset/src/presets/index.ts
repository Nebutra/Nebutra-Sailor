import type { PresetDefinition } from "../config";
import { PresetId } from "../config";
import { aiSaas } from "./ai-saas";
import { blogPortfolio } from "./blog-portfolio";
import { community } from "./community";
import { creative } from "./creative";
import { dashboard } from "./dashboard";
import { full } from "./full";
import { growth } from "./growth";
import { marketing } from "./marketing";
import { onePerson } from "./one-person";
import { overseas } from "./overseas";

export const presets: Record<string, PresetDefinition> = {
  "ai-saas": aiSaas,
  marketing: marketing,
  dashboard: dashboard,
  overseas: overseas,
  growth: growth,
  creative: creative,
  "blog-portfolio": blogPortfolio,
  community: community,
  "one-person": onePerson,
  full: full,
};

export function getPreset(id: string): PresetDefinition {
  // PresetId.parse() validates and throws a ZodError for unknown IDs,
  // so the lookup is always defined.
  return presets[PresetId.parse(id)] as PresetDefinition;
}

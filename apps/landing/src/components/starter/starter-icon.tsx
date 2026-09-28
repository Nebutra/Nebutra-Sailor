import {
  CreditCard,
  Fingerprint,
  Globe,
  Hook,
  type IconProps,
  ShieldCheck,
  Users,
} from "@nebutra/icons";
import type { ComponentType } from "react";

/** The icons a feature in src/content/site.ts can name. */
const ICONS = {
  fingerprint: Fingerprint,
  users: Users,
  card: CreditCard,
  globe: Globe,
  shield: ShieldCheck,
  plug: Hook,
} satisfies Record<string, ComponentType<IconProps>>;

export type IconName = keyof typeof ICONS;

export function StarterIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  const Icon = ICONS[name];
  return <Icon size={size} aria-hidden="true" />;
}

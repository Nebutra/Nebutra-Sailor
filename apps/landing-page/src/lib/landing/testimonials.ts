/**
 * Mock testimonial data for the marketing landing page.
 *
 * Names are prefixed `[FAKE]` so that integrators replacing the data with
 * real customer quotes do not accidentally ship placeholders.
 *
 * Quotes are kept in the source (not in i18n bundles) because they are
 * "voices" — preserving the original speaker's wording across locales is a
 * deliberate marketing choice.
 */
export interface TestimonialEntry {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly company: string;
  readonly quote: string;
  /** Initials shown when no avatar image is supplied. */
  readonly initials: string;
  /** Optional company logo path served from /public. */
  readonly logo?: string;
  /** Optional avatar image path served from /public. */
  readonly avatar?: string;
}

export const TESTIMONIALS: readonly TestimonialEntry[] = [
  {
    id: "sarah-chen",
    name: "[FAKE] Sarah Chen",
    role: "Founder & CTO",
    company: "Lumen Labs",
    quote:
      "Sailor cut our zero-to-paying-customer timeline from four months to nine days. Auth, billing, multi-tenancy, email — all wired up the moment we cloned the repo.",
    initials: "SC",
  },
  {
    id: "marcus-okafor",
    name: "[FAKE] Marcus Okafor",
    role: "Staff Engineer",
    company: "Northwind AI",
    quote:
      "The token system and design primitives are the cleanest I have used. Re-skinning for an enterprise pilot took an afternoon, not a sprint.",
    initials: "MO",
  },
  {
    id: "emma-tanaka",
    name: "[FAKE] Emma Tanaka",
    role: "Indie Hacker",
    company: "ShipFast Solo",
    quote:
      "I shipped my SaaS on a flight from Tokyo to Singapore. The China-friendly deployment story alone is worth the license.",
    initials: "ET",
  },
  {
    id: "david-park",
    name: "[FAKE] David Park",
    role: "Engineering Manager",
    company: "Helix Health",
    quote:
      "The RBAC layer and audit trail were the deciding factor. We replaced six months of internal platform work with one preset switch.",
    initials: "DP",
  },
  {
    id: "priya-shah",
    name: "[FAKE] Priya Shah",
    role: "Product Lead",
    company: "Ravensteel",
    quote:
      "Our designers stay in their tool, engineers stay in code, and the tokens just sync. It is the first design system we have actually kept in lock-step.",
    initials: "PS",
  },
  {
    id: "lucas-moreau",
    name: "[FAKE] Lucas Moreau",
    role: "Head of Platform",
    company: "Atlas Foundry",
    quote:
      "We swapped Clerk for Better Auth in a single config change. That kind of provider portability is non-negotiable for our compliance team.",
    initials: "LM",
  },
  {
    id: "yuki-sato",
    name: "[FAKE] Yuki Sato",
    role: "Solo Founder",
    company: "InkRoute",
    quote:
      "I do not write boilerplate anymore. Sailor is the closest thing to a Rails moment that AI-native SaaS has had.",
    initials: "YS",
  },
  {
    id: "amelia-fitz",
    name: "[FAKE] Amelia Fitzgerald",
    role: "VP Engineering",
    company: "Boreal Insights",
    quote:
      "Self-hosted Postgres, S3-compatible storage, queue you actually own. We deploy Sailor inside customer VPCs without rewriting a thing.",
    initials: "AF",
  },
  {
    id: "raj-mehta",
    name: "[FAKE] Raj Mehta",
    role: "CTO",
    company: "Quanta Loop",
    quote:
      "The metering and billing primitives saved us from building a Stripe wrapper that nobody on the team wanted to own.",
    initials: "RM",
  },
] as const;

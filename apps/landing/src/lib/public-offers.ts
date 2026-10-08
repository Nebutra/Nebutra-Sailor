import { z } from "zod";

const positive = z.number().positive();
const prices = z.object({ USD: positive.optional(), CNY: positive.optional() });
const range = z.object({ min: positive, max: positive }).refine((v) => v.max >= v.min);
const amounts = z.object({ USD: range.optional(), CNY: range.optional() });

const offerSchema = z
  .object({
    id: z.string().min(1),
    product: z.string().min(1),
    name: z.string().min(1),
    account: z.enum(["personal", "organization", "workspace"]),
    kind: z.enum(["membership", "credits", "balance"]),
    prices: prices.optional(),
    customAmount: amounts.optional(),
    grants: z.object({
      tier: z.string().optional(),
      days: z.number().int().positive().optional(),
      monthlyCredits: z.number().int().nonnegative().optional(),
      credits: z.number().int().positive().optional(),
      expiresInDays: z.number().int().positive().optional(),
    }),
    highlight: z.string().optional(),
  })
  .refine((offer) => {
    const fixed = Object.values(offer.prices ?? {}).some((v) => v !== undefined);
    const custom = Object.values(offer.customAmount ?? {}).some((v) => v !== undefined);
    return fixed !== custom;
  }, "An offer must have either fixed prices or a custom amount range")
  .refine(
    ({ kind, grants }) =>
      kind !== "membership" ||
      (Boolean(grants.tier) && grants.days !== undefined && grants.monthlyCredits !== undefined),
    "Membership benefits must include the tier, term and monthly credits",
  )
  .refine(({ kind, grants }) => kind !== "credits" || grants.credits !== undefined);

const catalogSchema = z.object({
  offers: z
    .array(offerSchema)
    .refine((offers) => new Set(offers.map((offer) => offer.id)).size === offers.length),
});

export type PublicOffer = z.infer<typeof offerSchema>;

/** Read the same public catalog that checkout uses; never substitute template defaults. */
export async function loadPublicOffers(apiOrigin: string): Promise<PublicOffer[]> {
  const response = await fetch(new URL("/api/v1/billing/offers", apiOrigin).toString(), {
    cache: "no-store",
    credentials: "omit",
    headers: { Accept: "application/json", "User-Agent": "Nebutra-Landing/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Pricing catalog returned HTTP ${response.status}`);
  return catalogSchema.parse(await response.json()).offers;
}

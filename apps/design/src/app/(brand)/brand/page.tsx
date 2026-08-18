// @brand-exempt: this page IS the brand — the swatch labels are the colours' Chinese names, and a page that shows the identity cannot source it from a token
import {
  allowedColorCombinations,
  brand,
  brandEasing,
  brandGradient,
  colorProhibitedUses,
  colors,
  logoColorUsage,
  logoEditions,
  logoMinSize,
  logoProhibitedUses,
  logoSafetyZone,
  logoVariants,
} from "@nebutra/brand";
import type { Metadata } from "next";
import { type LogoAsset, logoMarkup } from "@/lib/brand-assets";
import { Mono, PageHeader, Section } from "../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Brand — VI",
  description:
    "The visual identity, rendered from @nebutra/brand rather than described: logo, safety zone, colour scales, the gradient and its stops, and the motion language.",
};

/**
 * The VI manual as a surface rather than as prose.
 *
 * The same material exists in design-docs as six MDX pages and about 1,700
 * lines of description — clearance ratios, minimum sizes, prohibited uses,
 * three colour scales, the gradient's stops. Every one of those values is
 * already a typed export of `@nebutra/brand`, which means the prose version had
 * exactly one job it could not do: stay true. A ratio written in a sentence and
 * a ratio used by the product are two facts that drift.
 *
 * So nothing on this page is typed in. The safety zone below is drawn by
 * calling `logoSafetyZone.calculate`, the swatches are the scale objects the
 * tokens are generated from, and the gradient is rendered by handing
 * `brandGradient.primary.css` to the browser. Change the manual and this page
 * changes with it; change this page and you cannot, because there is nothing
 * here to change.
 */

const SAFETY_DEMO_HEIGHT = 64;

/**
 * One logo file, inlined. Missing files show as a gap rather than failing the
 * build — reporting what is absent is this site's job.
 */
function Asset({ asset, height }: { asset: LogoAsset; height: number }) {
  const markup = logoMarkup(asset, height);
  if (!markup) {
    return <span className="font-mono text-[11px] text-muted-foreground">{asset}.svg missing</span>;
  }
  // biome-ignore lint/security/noDangerouslySetInnerHtml: brand asset read from disk at build time
  return <span dangerouslySetInnerHTML={{ __html: markup }} />;
}

function Swatches({ scale, name }: { scale: Record<string, string>; name: string }) {
  const steps = Object.entries(scale);
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-baseline gap-3">
        <Mono>{name}</Mono>
        <span className="text-[12px] text-muted-foreground tabular-nums">{steps.length} steps</span>
      </div>
      <div className="grid grid-cols-6 gap-px overflow-hidden rounded-[var(--radius-md)] bg-border/50 sm:grid-cols-11">
        {steps.map(([step, hex]) => (
          <div className="flex flex-col bg-card" key={step}>
            <span className="h-12" style={{ backgroundColor: hex }} />
            <span className="pt-1.5 text-center font-mono text-[9px] text-muted-foreground">
              {step}
            </span>
            <span className="pb-1.5 text-center font-mono text-[8px] text-muted-foreground/70">
              {hex}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BrandPage() {
  const zone = logoSafetyZone.calculate(SAFETY_DEMO_HEIGHT);

  return (
    <div>
      <PageHeader eyebrow="brand" title="Visual identity">
        <p>
          Every value on this page is read from <Mono>@nebutra/brand</Mono> at build time — the same
          module the product, the favicon pipeline and the OG-image generator import. The manual
          describes the identity; this renders it, so the two cannot disagree.
        </p>
      </PageHeader>

      <Section title="Identity">
        <dl className="grid max-w-2xl grid-cols-[10rem_minmax(0,1fr)] gap-y-2 text-[14px]">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="text-foreground">{brand.name}</dd>
          <dt className="text-muted-foreground">Domain</dt>
          <dd className="text-foreground">
            <Mono>{brand.domains.landing.replace(/^https?:\/\//, "")}</Mono>
          </dd>
          <dt className="text-muted-foreground">Tagline</dt>
          <dd className="text-foreground">{brand.tagline}</dd>
        </dl>
      </Section>

      <Section
        note={
          <p>
            <Mono>logoColorUsage.preferred</Mono> is <Mono>{logoColorUsage.preferred}</Mono>, and
            this is that: the 正标, a multi-path export with real facet geometry and true gradients.
            There is no component form of it because there is nothing to parameterise — it is
            artwork, inlined here from the file the manual ships.
          </p>
        }
        title="Logo"
      >
        <div className="mb-8 flex min-h-[160px] items-center justify-center rounded-[var(--radius-lg)] bg-card p-10 shadow-ambient-sm">
          <Asset asset="logo-horizontal-en" height={64} />
        </div>

        {/* The trap, stated where it was fallen into. */}
        <p className="mb-8 max-w-2xl rounded-[var(--radius-md)] bg-muted/60 p-4 text-[13px] text-muted-foreground leading-relaxed">
          Not to be confused with <Mono>LogoEnColorSVG</Mono>, which is the mono path painted with a
          synthetic gradient and a baked wordmark. Its own source calls it “not VI 正标”. This page
          shipped it as the primary mark at first, which is how an identity page ends up showing
          everything except the identity.
        </p>

        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <div className="flex min-h-[150px] flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] bg-card p-6 shadow-ambient-sm">
            <span className="text-[hsl(var(--foreground))]">
              <Asset asset="logo-mono" height={52} />
            </span>
            <div className="text-center">
              <Mono>logo-mono</Mono>
              <p className="mt-1 text-[12px] text-muted-foreground">{logoColorUsage.rules.print}</p>
            </div>
          </div>
          <div className="flex min-h-[150px] flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] bg-foreground p-6">
            <span className="text-[hsl(var(--background))]">
              <Asset asset="logo-inverse" height={52} />
            </span>
            <div className="text-center">
              <code className="font-mono text-[12px] text-background/70">logo-inverse</code>
              <p className="mt-1 text-[12px] text-background/70">
                {logoColorUsage.rules.darkBackground}
              </p>
            </div>
          </div>
        </div>

        <p className="mb-8 max-w-2xl text-[13px] text-muted-foreground leading-relaxed">
          {logoColorUsage.rules.complexBackground}
        </p>

        {/* Clearance drawn on the 正标, not on a stand-in. */}
        <div className="mb-8">
          <div className="mb-2 flex flex-wrap items-baseline gap-3">
            <Mono>logoSafetyZone.ratio</Mono>
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {logoSafetyZone.ratio} × logo height = {zone.margin}px at {SAFETY_DEMO_HEIGHT}px
            </span>
          </div>
          <div className="inline-block rounded-[var(--radius-lg)] bg-muted">
            <div
              className="flex items-center justify-center rounded-[var(--radius-lg)] bg-card"
              style={{ padding: zone.margin }}
            >
              <Asset asset="logo-color" height={SAFETY_DEMO_HEIGHT} />
            </div>
          </div>
        </div>

        <dl className="mb-8 grid max-w-2xl grid-cols-[10rem_minmax(0,1fr)] gap-y-2 text-[14px]">
          <dt className="text-muted-foreground">Digital minimum</dt>
          <dd className="text-foreground tabular-nums">
            {logoMinSize.digital.minHeightPx}px height
          </dd>
          <dt className="text-muted-foreground">Print minimum</dt>
          <dd className="text-foreground tabular-nums">{logoMinSize.print.minHeightMm}mm height</dd>
          <dt className="text-muted-foreground">Lockups</dt>
          <dd className="text-foreground">{Object.keys(logoVariants).join(" · ")}</dd>
        </dl>

        {/* Two editions is a fact about the trademark, and it decides which file
            a document may use. It has no business being discoverable only by
            reading the directory listing. */}
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.values(logoEditions).map((edition) => (
            <div
              className="rounded-[var(--radius-lg)] bg-card p-5 shadow-ambient-sm"
              key={edition.version}
            >
              <p className="font-medium text-[15px] text-foreground">
                {edition.name} · {edition.nameEn} v{edition.version}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                {edition.description}
              </p>
              <p className="mt-3 text-[12px] text-muted-foreground">
                {edition.useCases.join(" · ")}
              </p>
              <p className="mt-2">
                <Mono>{edition.directory}/</Mono>
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        note={<p>Both scales are the objects the design tokens are generated from.</p>}
        title="Colour"
      >
        <Swatches name="colors.primary — 云毓蓝" scale={colors.primary} />
        <Swatches name="colors.accent — 云毓青" scale={colors.accent} />
        <Swatches name="colors.neutral — Slate" scale={colors.neutral} />
      </Section>

      <Section
        note={
          <p>
            The stops are the source of the gradient, and the midpoint is placed at the OKLab
            perceptual middle rather than at the numeric one — that is what keeps the centre from
            going muddy.
          </p>
        }
        title="Gradient"
      >
        <div
          className="mb-4 flex h-32 items-end rounded-[var(--radius-lg)] p-4"
          style={{ background: brandGradient.primary.css }}
        >
          <span className="font-medium text-[13px] text-white">{brandGradient.primary.angle}°</span>
        </div>
        <div className="flex flex-wrap gap-4">
          {brandGradient.primary.stops.map((stop) => (
            <div className="flex items-center gap-2" key={stop.color}>
              <span
                className="size-6 rounded-[var(--radius-sm)]"
                style={{ backgroundColor: stop.color }}
              />
              <span className="font-mono text-[12px] text-muted-foreground">
                {stop.color} · {stop.position}%
                {"note" in stop && stop.note ? ` · ${stop.note}` : ""}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-2xl text-[13px] text-muted-foreground leading-relaxed">
          {brandGradient.primary.usage}
        </p>
      </Section>

      <Section
        note={
          <p>
            Each pairing below is rendered with its own values, so the contrast claim is something
            you can check by looking rather than something you have to trust.
          </p>
        }
        title="Approved pairings"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allowedColorCombinations.map((combo) => (
            <div
              className="flex min-h-[92px] flex-col justify-between rounded-[var(--radius-lg)] p-4"
              key={combo.name}
              style={{ background: combo.background, color: combo.foreground }}
            >
              <span className="font-medium text-[14px]">{combo.name}</span>
              <span className="font-mono text-[11px] opacity-80">{combo.contrast}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        note={
          <p>
            The manual's prohibitions, kept as data so a rule cannot be quietly dropped from the
            docs while staying in the manual.
          </p>
        }
        title="Prohibited"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-medium text-[14px] text-foreground">
              Logo · {logoProhibitedUses.length}
            </p>
            <ul className="flex flex-col gap-2">
              {logoProhibitedUses.map((rule) => (
                <li className="rounded-[var(--radius-md)] bg-muted/60 p-3" key={rule.id}>
                  <span className="font-medium text-[13px] text-foreground">{rule.name}</span>
                  <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                    {rule.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 font-medium text-[14px] text-foreground">
              Colour · {colorProhibitedUses.length}
            </p>
            <ul className="flex flex-col gap-2">
              {colorProhibitedUses.map((rule) => (
                <li className="rounded-[var(--radius-md)] bg-muted/60 p-3" key={rule.id}>
                  <span className="font-medium text-[13px] text-foreground">{rule.name}</span>
                  <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                    {rule.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section
        note={
          <p>
            The brand easing curves. These are the control points the product's motion presets are
            built from — <Mono>--ease-*</Mono> on the Motion page is where they reach components.
          </p>
        }
        title="Motion language"
      >
        <div className="flex flex-col gap-3">
          {Object.entries(brandEasing).map(([name, points]) => (
            <div className="flex items-baseline gap-4" key={name}>
              <Mono>{name}</Mono>
              <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
                cubic-bezier({(points as readonly number[]).join(", ")})
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

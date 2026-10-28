import * as AllIcons from "@nebutra/icons";
import type { Metadata } from "next";
import { IconGallery } from "@/components/icon-gallery";
import { Mono, PageHeader, Section } from "../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Icons — foundations",
  description:
    "IconBox: the Geist set as a workbench — search, categories, size, weight and colour controls, and one click to copy the import, the React element or the SVG — plus the three-tier rule for which library a surface may reach for.",
};

/**
 * The icon set, and the rule about which set.
 *
 * The count is `Object.keys` on the package rather than a number in a sentence,
 * because the package is generated from the Geist source and a hand-written
 * figure would be wrong the first time that regenerates. The gallery is the same
 * component design-docs used, imported rather than reimplemented.
 *
 * The tier rule underneath is the part that cannot be derived: which library a
 * surface may reach for is a governance decision, and it is enforced by a lint
 * rule rather than by hope — which is worth saying on the page, because a reader
 * who knows there is a check behaves differently from one who thinks it is a
 * preference.
 */

const TIERS = [
  {
    tier: "1",
    library: "@nebutra/icons",
    scope: "Every product and dashboard surface. The default.",
    why: "The Geist set, same visual language as Vercel and v0. Tree-shakable TSX, no runtime.",
  },
  {
    tier: "2",
    library: "@phosphor-icons/react",
    scope: "Marketing surfaces only — the landing app and the marketing components.",
    why: "Thin and duotone weights the Geist set does not carry. Lint-enforced: outside those two directories it fails the build.",
  },
  {
    tier: "3",
    library: "lucide-react",
    scope: "None. Deprecated.",
    why: "Zero new imports. The existing ones were swept; the rule exists so they do not come back.",
  },
] as const;

export default function IconsPage() {
  const count = Object.keys(AllIcons).filter((name) => name !== "IconProps").length;

  return (
    <div>
      <PageHeader eyebrow="foundations / icons" title="Icons">
        <p>
          {count} icons, generated from the Geist source into tree-shakable components. IconBox
          below renders every one from <Mono>@nebutra/icons</Mono> — the count is{" "}
          <Mono>Object.keys</Mono> on the package, so it cannot drift from what ships.
        </p>
      </PageHeader>

      <Section
        note={
          <p>
            Three libraries exist in this repo and only one of them is a default. The boundary is a
            lint rule, not a preference — a Phosphor import outside the marketing directories fails{" "}
            <Mono>pnpm lint</Mono>.
          </p>
        }
        title="Which set"
      >
        <div className="overflow-x-auto">
          <table className="w-full max-w-3xl min-w-[640px] table-fixed text-start text-ui">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[34%]" />
              <col className="w-[40%]" />
            </colgroup>
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="pb-2 font-medium">Library</th>
                <th className="pb-2 font-medium">Where</th>
                <th className="pb-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((row) => (
                <tr className="align-top" key={row.library}>
                  <td className="py-3 pe-6">
                    <Mono>{row.library}</Mono>
                  </td>
                  <td className="py-3 pe-6 text-foreground">{row.scope}</td>
                  <td className="py-3 text-muted-foreground">{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        note={
          <>
            <p>
              Search matches the set&apos;s own names and the words people type — <Mono>close</Mono>{" "}
              finds <Mono>Cross</Mono>, <Mono>delete</Mono> finds <Mono>Trash</Mono>. Categories are
              derived from the names, because the Geist source ships none. A click copies the format
              you pick; the panel beside the grid holds all three.
            </p>
            <p>
              The Geist glyphs are filled shapes, not strokes. <Mono>Weight</Mono> lays an SVG
              stroke over the fill, which thickens the drawing outward; at zero you get the glyph
              exactly as shipped. Colour sets a semantic text class, so a copied snippet follows the
              theme. Brand logos keep their own colours.
            </p>
          </>
        }
        title="IconBox"
      >
        <IconGallery />
      </Section>
    </div>
  );
}

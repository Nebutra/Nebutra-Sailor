import type { PresetId } from "../compile-helpers";
import type { BrandPackage } from "../types";
import type { CompileContext } from "./context";
import { buildGeneric } from "./generic";
import { buildGsap } from "./gsap";
import { buildLinear } from "./linear";
import { buildNotion } from "./notion";
import { buildRaycast } from "./raycast";
import { buildStripe } from "./stripe";
import { buildVanta } from "./vanta";
import { buildVercel } from "./vercel";

export type { CompileContext } from "./context";

const PRESET_BUILDERS: Record<
  Exclude<PresetId, "generic">,
  (ctx: CompileContext) => BrandPackage
> = {
  linear: buildLinear,
  gsap: buildGsap,
  raycast: buildRaycast,
  vercel: buildVercel,
  notion: buildNotion,
  stripe: buildStripe,
  vanta: buildVanta,
};

export function buildPresetBrand(preset: PresetId, ctx: CompileContext): BrandPackage {
  if (preset === "generic") return buildGeneric(ctx);
  return PRESET_BUILDERS[preset](ctx);
}

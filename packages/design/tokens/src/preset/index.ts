/**
 * @nebutra/tokens/preset — a project's look as a short code (ADR 2026-09-27
 * Sailor Studio). Studio encodes one; `nebutra apply --preset` and
 * `create-sailor --preset` write it to packages/design/tokens/project/preset;
 * the tokens build resolves it into project.css.
 */
export {
  decodePreset,
  encodePreset,
  PRESET_CODE_VERSION,
  PresetCodeError,
  parsePreset,
} from "./codec";
export { factoryBrandPackage } from "./factory";
export * from "./knobs";
export { type ResolvedPreset, resolvePreset } from "./resolve";
export {
  PRESET_SCHEMA_ID,
  presetArgument,
  presetFromJson,
  presetJsonSchema,
  readPresetInput,
  STUDIO_URL,
  studioReviewUrl,
} from "./schema";

import { PRESET_PREVIEW_BRAND } from "@/lib/preset-carrier";
import { PRESET_PREVIEW } from "@/lib/preset-preview-flag";

/**
 * The template wears no Brand Package of its own. The preview build Sailor
 * Studio links to (acme) wears the Studio carrier, which /preset-preview.css
 * paints with each visitor's chosen look. See site-theme.ts; template-build
 * puts this file in its place.
 */
export const SITE_BRAND: string | undefined = PRESET_PREVIEW ? PRESET_PREVIEW_BRAND : undefined;

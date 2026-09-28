/**
 * Whether this build is the preview site Sailor Studio links to (acme): it
 * wears the look a visitor chose in Studio (components/preset-preview.tsx,
 * app/preset-preview.css). A project's own site never sets it.
 *
 * A plain module on purpose. Read from a "use client" file, a server component
 * gets a client reference instead of the boolean — an object, always truthy —
 * and every site would link the preview stylesheet.
 */
export const PRESET_PREVIEW = process.env.NEXT_PUBLIC_PRESET_PREVIEW === "1";

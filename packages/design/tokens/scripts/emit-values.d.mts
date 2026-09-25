/** Parse top-level `:root` / `.dark` custom properties out of a stylesheet. */
export function extractValues(css: string): Map<string, { light?: string; dark?: string }>;

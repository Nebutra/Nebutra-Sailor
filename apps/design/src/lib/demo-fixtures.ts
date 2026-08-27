import { brand } from "@nebutra/brand/metadata";

/**
 * Sample values the component demos render.
 *
 * Derived rather than typed out, for the same reason the token tables are read
 * from the source: this site is what a fork sees first, and a fork that has
 * replaced the brand should not find the upstream vendor's domain sitting in
 * every input placeholder. It also keeps the demos out of the brand-literal
 * ratchet, which they were adding to.
 *
 * The local parts stay fictional on purpose — Ada and Grace are placeholders,
 * not addresses anyone can reach.
 */
const apex = brand.domains.landing.replace(/^https?:\/\//, "").replace(/\/+$/, "");

/** An address in a text field. */
export const DEMO_EMAIL = `ada@${apex}`;

/** A second address, for demos that show two people. */
export const DEMO_EMAIL_ALT = `grace@${apex}`;

/** Tenant-subdomain suffix, for the "your-team.<app>" affix demo. */
export const DEMO_APP_SUFFIX = `.${brand.domains.app.replace(/^https?:\/\//, "")}`;

/** A long value, to show how a field truncates one. */
export const DEMO_LONG_URL = `https://frankfurt-eu-central-1.analytics.internal.${apex}/v2/ingest`;

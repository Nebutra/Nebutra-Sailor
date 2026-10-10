/**
 * The investors page's contact: a prefilled email to the founders' inbox, one subject per track.
 * No form backend on kcq.nebutra.com, so nothing new to secure or keep alive: the visitor's own
 * mail client sends it, and the address stays visible and copyable for anyone without one.
 */
import { brand } from "@nebutra/brand/metadata";

/** Where investors and design partners write: the founders' inbox (also in llms.txt). */
export const INVESTOR_EMAIL = `tseka@${brand.domains.landing}`;

export const CONTACT_TRACKS = ["investors", "partners"] as const;
export type ContactTrack = (typeof CONTACT_TRACKS)[number];

export function mailtoHref(subject: string, body: string, to: string = INVESTOR_EMAIL): string {
  // encodeURIComponent, not URLSearchParams: mail clients read `+` literally, not as a space.
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

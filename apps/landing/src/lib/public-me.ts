/**
 * Signed-in profile slice for marketing chrome.
 *
 * One in-flight request is shared across the desktop cluster, the mobile
 * header avatar, and the drawer so a single page does not fan out.
 */

import { env } from "@/lib/env";

export interface PublicMe {
  name: string;
  email: string;
  avatarUrl: string | null;
  activeOrganization: { name: string; slug: string } | null;
}

const APP_URL = env.NEXT_PUBLIC_APP_URL;

let inflight: Promise<PublicMe | null> | null = null;

export function resetPublicMeCache(): void {
  inflight = null;
}

export function loadPublicMe(): Promise<PublicMe | null> {
  // A demo site (NEXT_PUBLIC_DEMO_CTA_URL) has no product
  // app behind it: the request could only 404 and log a console error.
  if (env.NEXT_PUBLIC_DEMO_CTA_URL) return Promise.resolve(null);
  if (!inflight) {
    inflight = fetch(`${APP_URL}/api/me/public`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as PublicMe;
      })
      .catch(() => null);
  }
  return inflight;
}

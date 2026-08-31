"use client";

import { useTranslations } from "next-intl";
import { env } from "@/lib/env";
import { usePublicMe } from "@/lib/use-public-me";
import { UserAvatarMenu } from "./UserAvatarMenu";

const APP_URL = env.NEXT_PUBLIC_APP_URL;

/**
 * Desktop signed-in chrome. Sign In / Get Sailed stay up until `/api/me/public`
 * resolves so anonymous visitors never flash an empty header. Once a session
 * is confirmed those CTAs hide — they are not the logged-in state.
 */
export function NavbarAuthCluster(): React.ReactElement {
  const t = useTranslations("nav");
  const me = usePublicMe();

  return (
    <>
      <UserAvatarMenu />
      {me ? null : (
        <>
          <a
            href={`${APP_URL}/sign-in`}
            className="whitespace-nowrap text-[0.8rem] font-medium text-neutral-11 transition-colors hover:text-neutral-12 xl:text-sm"
          >
            {t("signIn")}
          </a>
          <a
            href={`${APP_URL}/sign-up`}
            className="whitespace-nowrap rounded-[var(--radius-lg)] bg-[color:hsl(var(--foreground))] px-3 py-1.5 text-[0.8rem] font-medium text-[color:hsl(var(--background))] shadow-sm transition-colors hover:bg-[color:hsl(var(--muted-foreground))] xl:px-4 xl:py-2 xl:text-sm"
          >
            {t("getStarted")}
          </a>
        </>
      )}
    </>
  );
}

NavbarAuthCluster.displayName = "NavbarAuthCluster";

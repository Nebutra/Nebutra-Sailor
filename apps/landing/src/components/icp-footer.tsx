import { useTranslations } from "next-intl";
import { isZhUiLocale } from "@/lib/i18n/localized";

export interface IcpFooterProps {
  /** Current locale; component renders only when this is "zh". */
  locale: string;
  /** ICP record number — typically `process.env.NEXT_PUBLIC_ICP_NUMBER`. */
  icpNumber?: string | undefined;
  /** Optional 公安备案 (Public Security record). */
  publicSecurityRecord?: string | undefined;
}

/**
 * Renders the mandatory mainland-China ICP filing footer.
 *
 * Only renders when:
 *   - `isZhUiLocale(locale)`, AND
 *   - `icpNumber` is non-empty
 *
 * Both checks happen at render time so a partially-configured deploy
 * silently no-ops instead of showing a broken footer.
 */
export function IcpFooter({ locale, icpNumber, publicSecurityRecord }: IcpFooterProps) {
  const t = useTranslations("compliance.icp");

  if (locale !== "zh") return null;
  if (!icpNumber || icpNumber.trim().length === 0) return null;

  const trimmedIcp = icpNumber.trim();
  const trimmedPsr = publicSecurityRecord?.trim();

  return (
    <div
      data-testid="icp-footer"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-center text-xs text-muted-foreground"
    >
      <a
        href="https://beian.miit.gov.cn"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("recordNumber")}
        className="hover:text-foreground hover:underline"
      >
        {trimmedIcp}
      </a>
      {trimmedPsr ? (
        <>
          <span aria-hidden className="select-none text-muted-foreground">
            ·
          </span>
          <a
            href="http://www.beian.gov.cn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("publicSecurity")}
            className="hover:text-foreground hover:underline"
          >
            {t("publicSecurity")} {trimmedPsr}
          </a>
        </>
      ) : null}
    </div>
  );
}

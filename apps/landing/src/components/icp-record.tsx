import { useTranslations } from "next-intl";

export interface IcpRecordProps {
  /** ICP record number. Defaults to `NEXT_PUBLIC_ICP_NUMBER`, inlined at build. */
  icpNumber?: string | undefined;
  /** 公安备案 record. Defaults to `NEXT_PUBLIC_PUBLIC_SECURITY_RECORD`. */
  publicSecurityRecord?: string | undefined;
  className?: string;
}

/**
 * The mainland-China filing links (ICP, and 公安备案 when there is one), as an
 * inline fragment for a footer row. The one place the record renders: the
 * site footer and the minimal footer both use it, on every locale — the filing
 * covers the domain, not a language. Renders nothing when no number is set, so
 * the template and unfiled deploys show no broken link.
 */
export function IcpRecord({
  icpNumber = process.env.NEXT_PUBLIC_ICP_NUMBER,
  publicSecurityRecord = process.env.NEXT_PUBLIC_PUBLIC_SECURITY_RECORD,
  className,
}: IcpRecordProps) {
  const t = useTranslations("compliance.icp");
  const icp = icpNumber?.trim();
  if (!icp) return null;
  const psr = publicSecurityRecord?.trim();

  return (
    <span data-testid="icp-record" className={className}>
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("recordNumber")}
        className="hover:text-foreground"
      >
        {icp}
      </a>
      {psr ? (
        <>
          <span aria-hidden className="mx-2 select-none">
            ·
          </span>
          <a
            href="https://beian.mps.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("publicSecurity")}
            className="hover:text-foreground"
          >
            {t("publicSecurity")} {psr}
          </a>
        </>
      ) : null}
    </span>
  );
}

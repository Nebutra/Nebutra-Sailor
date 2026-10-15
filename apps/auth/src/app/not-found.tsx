import { FullPageStatus } from "@nebutra/ui/layout";
import { useTranslations } from "next-intl";

/** No route matched the address. */
export default function NotFound() {
  const tCopy = useTranslations("copy.authNotFound");
  const tc = useTranslations("copy.authNotFound");
  return (
    <FullPageStatus
      code="Error 404"
      title={tc("weCouldnTFind")}
      description={tc("theAddressMayBe")}
      primaryAction={{ label: tCopy("goHome"), href: "/" }}
    />
  );
}

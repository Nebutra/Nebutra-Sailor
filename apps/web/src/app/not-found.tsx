import { FullPageStatus } from "@nebutra/ui/layout";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const tc = useTranslations("copy.webNotFound");
  return (
    <FullPageStatus
      code="404"
      title={tc("thisPageIsNot")}
      description={tc("checkTheURLOr")}
      primaryAction={{ label: "Back to dashboard", href: "/workspace" }}
    />
  );
}

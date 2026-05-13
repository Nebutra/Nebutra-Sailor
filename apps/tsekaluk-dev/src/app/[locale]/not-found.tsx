import { PageStatus } from "@/components/ui/PageStatus";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return <PageStatus kind="not-found" label="404" message="Page not found." LocaleLink={Link} />;
}

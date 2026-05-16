import { FullPageStatus } from "@nebutra/ui/layout";

// Global fallback for routes that don't match a locale (e.g. /wrong)
export default function GlobalNotFound() {
  return (
    <FullPageStatus
      code="404"
      title="Page Not Found"
      description="The link may be outdated, or the page may have moved."
      primaryAction={{ label: "Back to Nebutra", href: "/" }}
      secondaryAction={{ label: "Open docs", href: "/docs" }}
    />
  );
}

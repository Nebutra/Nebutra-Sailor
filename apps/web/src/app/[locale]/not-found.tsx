import { FullPageStatus } from "@nebutra/ui/layout";

export default function NotFound() {
  return (
    <FullPageStatus
      code="404"
      title="This page is not available."
      description="Check the URL, or return to your dashboard."
      primaryAction={{ label: "Back to dashboard", href: "/" }}
    />
  );
}

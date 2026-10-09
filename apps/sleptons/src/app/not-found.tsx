import { FullPageStatus } from "@nebutra/ui/layout";

/** No route matched the address. */
export default function NotFound() {
  return (
    <FullPageStatus
      code="Error 404"
      title="We couldn't find that page."
      description="The address may be mistyped, or the page has moved."
      primaryAction={{ label: "Go home", href: "/" }}
    />
  );
}

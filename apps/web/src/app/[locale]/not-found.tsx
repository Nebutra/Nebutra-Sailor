import { FullPageStatus } from "@nebutra/ui/layout";

export default function NotFound() {
  return (
    <FullPageStatus
      code="Error 404"
      title={
        <>
          We couldn&apos;t find that <FullPageStatus.Accent>page</FullPageStatus.Accent>.
        </>
      }
      description="The page you're looking for doesn't exist or has been moved. Check the URL, or head back to the dashboard."
      primaryAction={{ label: "Go to dashboard", href: "/" }}
      secondaryAction={{ label: "Contact support", href: "/support" }}
    />
  );
}

import { FullPageStatus } from "@nebutra/ui/layout";

interface NotFoundPanelProps {
  title: string;
  desc: string;
  homeText: string;
  docsText: string;
}

export function NotFoundPanel({ title, desc, homeText, docsText }: NotFoundPanelProps) {
  return (
    <FullPageStatus
      code="404"
      title={title}
      description={desc}
      primaryAction={{ label: homeText, href: "/" }}
      secondaryAction={{ label: docsText, href: "/docs" }}
      variant="section"
    />
  );
}

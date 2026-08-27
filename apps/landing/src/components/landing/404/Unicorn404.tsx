import { FullPageStatus } from "@nebutra/ui/layout";

interface Unicorn404Props {
  title: string;
  desc: string;
  homeText: string;
  docsText: string;
}

export function Unicorn404({ title, desc, homeText, docsText }: Unicorn404Props) {
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

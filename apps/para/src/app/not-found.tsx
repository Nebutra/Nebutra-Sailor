import { FullPageStatus } from "@nebutra/ui/layout";

/** No route matched the address. */
export default function NotFound() {
  return (
    <FullPageStatus
      code="Error 404"
      title="这里什么也没有。"
      description="链接可能写错了，或者页面已经换了地方。"
      primaryAction={{ label: "回首页", href: "/" }}
    />
  );
}

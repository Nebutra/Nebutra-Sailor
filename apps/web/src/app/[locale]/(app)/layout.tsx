import { DesignSystemShell } from "../providers/design-system-shell";

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DesignSystemShell hasClerkKey={hasClerkKey}>{children}</DesignSystemShell>;
}

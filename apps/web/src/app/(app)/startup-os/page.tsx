import { redirect } from "next/navigation";
import { StartupCommandCenter } from "@/components/startup-os/startup-command-center";
import { resolveAuthenticatedHomePath } from "@/lib/authenticated-home-path";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";

export default function StartupAgentOSPage() {
  if (!isStartupOSPrototypeEnabled()) {
    redirect(resolveAuthenticatedHomePath());
  }

  return <StartupCommandCenter />;
}

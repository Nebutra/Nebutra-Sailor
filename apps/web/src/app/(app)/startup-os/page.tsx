import { notFound } from "next/navigation";
import { StartupCommandCenter } from "@/components/startup-os/startup-command-center";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";

export default function StartupAgentOSPage() {
  if (!isStartupOSPrototypeEnabled()) {
    notFound();
  }

  return <StartupCommandCenter />;
}

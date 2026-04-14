import { FeatureIconItem } from "@nebutra/ui/primitives";
import { Cloud, Cpu, Globe, Shield, Smartphone, Zap } from "lucide-react";

export function FeatureIconItemDemo() {
  return (
    <div className="max-w-4xl p-4 md:p-8 my-8 mx-auto w-full">
      <div className="md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 grid grid-cols-1">
        <FeatureIconItem
          icon={Zap}
          iconClassName="text-orange-500"
          title="Fast Performance"
          description="Optimized for speed and minimal bundle sizes to ensure lightning-fast load times."
        />

        <FeatureIconItem
          icon={Shield}
          iconClassName="text-emerald-500"
          title="Secure by Default"
          description="Built with security best practices in mind, protecting against common web vulnerabilities."
        />

        <FeatureIconItem
          icon={Smartphone}
          iconClassName="text-blue-500"
          title="Fully Responsive"
          description="Layouts that adapt seamlessly to any screen size, from mobile phones to massive desktops."
        />

        <FeatureIconItem
          icon={Globe}
          iconClassName="text-indigo-500"
          title="Global Edge Network"
          description="Deploy your applications to the edge for minimum latency wherever your users are."
        />

        <FeatureIconItem
          icon={Cpu}
          iconClassName="text-rose-500"
          title="AI-Powered"
          description="Integrate machine learning models seamlessly into your workflows with our APIs."
        />

        <FeatureIconItem
          icon={Cloud}
          iconClassName="text-cyan-500"
          title="Cloud Native"
          description="Designed to run perfectly in modern containerized cloud environments."
        />
      </div>
    </div>
  );
}

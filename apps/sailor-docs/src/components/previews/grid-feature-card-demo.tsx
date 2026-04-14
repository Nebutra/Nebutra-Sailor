import { GridFeatureCard } from "@nebutra/ui/primitives";
import { Cpu, Database, Lock, Network } from "lucide-react";

export function GridFeatureCardDemo() {
  return (
    <div className="md:grid-cols-2 gap-4 max-w-4xl p-4 md:p-8 mx-auto grid w-full grid-cols-1">
      <GridFeatureCard
        icon={Network}
        title="Global Edge Network"
        description="Deploy your applications to the edge for minimum latency and maximum performance wherever your users are located."
        gridSize={24}
        className="rounded-xl border"
      />

      <GridFeatureCard
        icon={Database}
        title="Distributed Database"
        description="A globally distributed, multi-model database service for any scale with single-digit millisecond latency."
        gridSize={20}
        className="rounded-xl border"
      />

      <GridFeatureCard
        icon={Lock}
        title="Zero Trust Security"
        description="Every request is authenticated and authorized. Threat detection and DDoS protection is built-in by default."
        gridSize={16}
        className="rounded-xl border"
      />

      <GridFeatureCard
        icon={Cpu}
        title="Serverless Compute"
        description="Run code without thinking about servers. Pay only for the compute time you consume."
        gridSize={28}
        className="rounded-xl border"
      />
    </div>
  );
}

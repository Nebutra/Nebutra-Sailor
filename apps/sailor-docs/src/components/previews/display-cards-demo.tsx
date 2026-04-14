import { DisplayCards } from "@nebutra/ui/primitives";
import { Rocket, Shield, Zap } from "lucide-react";

export function DisplayCardsDemo() {
  const cards = [
    {
      title: "Lightning Fast",
      description: "Optimized for speed and performance.",
      date: "Core Feature",
      icon: <Zap className="size-5 text-amber-500" />,
      titleClassName: "text-amber-500",
    },
    {
      title: "Bank-grade Security",
      description: "Your data is encrypted at rest and in transit.",
      date: "Default",
      icon: <Shield className="size-5 text-green-500" />,
      titleClassName: "text-green-500",
    },
    {
      title: "Ready for Scale",
      description: "Built for teams of 1 to 10,000.",
      date: "Enterprise",
      icon: <Rocket className="size-5 text-indigo-500" />,
      titleClassName: "text-indigo-500",
    },
  ];

  return (
    <div className="p-8 flex min-h-[450px] w-full items-center justify-center">
      {/* DisplayCards uses fixed offsets and skewing, center it visually */}
      <div className="-ml-32 mt-12 relative">
        <DisplayCards cards={cards} />
      </div>
    </div>
  );
}

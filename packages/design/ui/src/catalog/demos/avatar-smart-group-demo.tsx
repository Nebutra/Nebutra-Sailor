"use client";

import { AvatarSmartGroup } from "@nebutra/ui/primitives"; // Adjust if necessary

export function AvatarSmartGroupDemo() {
  return (
    <div className="gap-8 flex flex-col">
      <AvatarSmartGroup
        users={[
          { name: "Olivia Anderson", role: "UI/UX Designer", image: "" },
          { name: "Liam Patel", role: "Frontend Developer", image: "" },
          { name: "Sophia Nguyen", role: "Project Manager", image: "" },
          { name: "Ethan Rodriguez", role: "Marketing Lead", image: "" },
          { name: "Ava Thompson", role: "Quality Engineer", image: "" },
        ]}
        variant="uniform"
        size={56}
        overlap={-12}
      />

      <AvatarSmartGroup
        users={[
          { name: "Olivia Anderson", role: "UI/UX Designer", image: "" },
          { name: "Liam Patel", role: "Frontend Developer", image: "" },
          { name: "Sophia Nguyen", role: "Project Manager", image: "" },
        ]}
        variant="centered"
        size={56}
        sizeStep={12}
        overlap={-14}
        ringColor="ring-background"
        hoverScale={1.15}
        tooltipBg="bg-primary text-primary-foreground"
      />
    </div>
  );
}

"use client";

import { AvatarSmartGroup } from "@nebutra/ui/primitives";

export function AvatarSmartGroupDemo() {
  const users = [
    {
      name: "Olivia Anderson",
      role: "UI/UX Designer",
      image: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      name: "Liam Patel",
      role: "Frontend Developer",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      name: "Sophia Nguyen",
      role: "Project Manager",
      image: "https://randomuser.me/api/portraits/women/68.jpg",
    },
    {
      name: "Ethan Rodriguez",
      role: "Marketing Lead",
      image: "https://randomuser.me/api/portraits/men/76.jpg",
    },
    {
      name: "Ava Thompson",
      role: "Quality Engineer",
      image: "https://randomuser.me/api/portraits/women/15.jpg",
    },
  ];

  return (
    <div className="flex w-full flex-col items-center justify-center space-y-12 py-8">
      {/* 🟢 Uniform Variant */}
      <div className="space-y-4 text-center">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Uniform
        </h2>
        <AvatarSmartGroup
          users={users}
          variant="uniform"
          size={56}
          overlap={-12}
          ringColor="ring-background"
        />
      </div>

      {/* 🔵 Centered Variant */}
      <div className="space-y-4 text-center">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Centered
        </h2>
        <AvatarSmartGroup
          users={users}
          variant="centered"
          size={56}
          sizeStep={12}
          overlap={-14}
          ringColor="ring-background"
          hoverScale={1.15}
        />
      </div>
    </div>
  );
}

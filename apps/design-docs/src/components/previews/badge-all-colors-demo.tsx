"use client";

import { Badge } from "@nebutra/ui/primitives";

export function BadgeAllColorsDemo() {
  return (
    <div className="gap-2 max-w-sm mx-auto flex w-full flex-col items-center justify-center">
      <div className="gap-2 flex">
        <Badge variant="gray">gray</Badge>
        <Badge variant="gray-subtle">gray-subtle</Badge>
      </div>
      <div className="gap-2 flex">
        <Badge variant="blue">blue</Badge>
        <Badge variant="blue-subtle">blue-subtle</Badge>
      </div>
      <div className="gap-2 flex">
        <Badge variant="purple">purple</Badge>
        <Badge variant="purple-subtle">purple-subtle</Badge>
      </div>
      <div className="gap-2 flex">
        <Badge variant="amber">amber</Badge>
        <Badge variant="amber-subtle">amber-subtle</Badge>
      </div>
      <div className="gap-2 flex">
        <Badge variant="red">red</Badge>
        <Badge variant="red-subtle">red-subtle</Badge>
      </div>
      <div className="gap-2 flex">
        <Badge variant="pink">pink</Badge>
        <Badge variant="pink-subtle">pink-subtle</Badge>
      </div>
      <div className="gap-2 flex">
        <Badge variant="green">green</Badge>
        <Badge variant="green-subtle">green-subtle</Badge>
      </div>
      <div className="gap-2 flex">
        <Badge variant="teal">teal</Badge>
        <Badge variant="teal-subtle">teal-subtle</Badge>
      </div>
      <div className="gap-2 flex">
        <Badge variant="inverted">inverted</Badge>
      </div>
      <div className="gap-2 flex">
        <Badge variant="trial">trial</Badge>
      </div>
      <div className="gap-2 flex">
        <Badge variant="turbo">turborepo</Badge>
      </div>
    </div>
  );
}

"use client";

import { Badge1 } from "@nebutra/ui/primitives";

export function BadgeAllColorsDemo() {
  return (
    <div className="gap-2 max-w-sm mx-auto flex w-full flex-col items-center justify-center">
      <div className="gap-2 flex">
        <Badge1 variant="gray">gray</Badge1>
        <Badge1 variant="gray-subtle">gray-subtle</Badge1>
      </div>
      <div className="gap-2 flex">
        <Badge1 variant="blue">blue</Badge1>
        <Badge1 variant="blue-subtle">blue-subtle</Badge1>
      </div>
      <div className="gap-2 flex">
        <Badge1 variant="purple">purple</Badge1>
        <Badge1 variant="purple-subtle">purple-subtle</Badge1>
      </div>
      <div className="gap-2 flex">
        <Badge1 variant="amber">amber</Badge1>
        <Badge1 variant="amber-subtle">amber-subtle</Badge1>
      </div>
      <div className="gap-2 flex">
        <Badge1 variant="red">red</Badge1>
        <Badge1 variant="red-subtle">red-subtle</Badge1>
      </div>
      <div className="gap-2 flex">
        <Badge1 variant="pink">pink</Badge1>
        <Badge1 variant="pink-subtle">pink-subtle</Badge1>
      </div>
      <div className="gap-2 flex">
        <Badge1 variant="green">green</Badge1>
        <Badge1 variant="green-subtle">green-subtle</Badge1>
      </div>
      <div className="gap-2 flex">
        <Badge1 variant="teal">teal</Badge1>
        <Badge1 variant="teal-subtle">teal-subtle</Badge1>
      </div>
      <div className="gap-2 flex">
        <Badge1 variant="inverted">inverted</Badge1>
      </div>
      <div className="gap-2 flex">
        <Badge1 variant="trial">trial</Badge1>
      </div>
      <div className="gap-2 flex">
        <Badge1 variant="turbo">turborepo</Badge1>
      </div>
    </div>
  );
}

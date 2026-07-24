"use client";

import { Separator } from "@nebutra/ui/primitives";
export function Separator2Demo() {
  return (
    <>
      <div className="w-full text-center">
        <p>Section one content</p>
      </div>
      <Separator className="my-4" />
      <div className="w-full text-center">
        <p>Section two content</p>
      </div>
    </>
  );
}

"use client";

import { Pagination } from "@nebutra/ui/primitives";

export function PaginationDemo() {
  return (
    <Pagination
      previous={{
        title: "Installation",
        href: "#installation",
      }}
      next={{
        title: "Theming",
        href: "#theming",
      }}
    />
  );
}

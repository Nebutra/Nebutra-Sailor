import type { ReactNode } from "react";

/** Router page frame — content width default (console density). */
export function PageFrame({
  children,
  width = "content",
  className,
}: {
  children: ReactNode;
  width?: "wide" | "content" | "text";
  className?: string;
}) {
  const max = width === "wide" ? "max-w-[1400px]" : width === "content" ? "max-w-5xl" : "max-w-3xl";
  return (
    <div
      className={["mx-auto w-full px-6 py-10 md:py-12", max, className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}

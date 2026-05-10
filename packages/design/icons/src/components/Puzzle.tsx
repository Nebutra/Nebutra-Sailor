import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Puzzle = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, width, height, ...props }, ref) => (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      ref={ref}
      {...props}
    >
      <path
        fill="transparent"
        stroke="currentColor"
        strokeWidth={1.5}
        d="M12.25 14.25V10l.671.112a2 2 0 0 0 2.329-1.973v-.278a2 2 0 0 0-2.329-1.973L12.25 6V1.75H8.235l.073.754a1.821 1.821 0 1 1-3.627.01l.069-.764h-4v12.5z"
      />
    </svg>
  ),
);
Puzzle.displayName = "Puzzle";

export { Puzzle };
export default Puzzle;

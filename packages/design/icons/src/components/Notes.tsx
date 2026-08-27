import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Notes = forwardRef<SVGSVGElement, IconProps>(
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
        fill="currentColor"
        fillRule="evenodd"
        d="M13 2.5H3v2h10zm-10 5V5.75h1.75V7.5zm1.75 1.25H3v1.75h1.75zM6 10.5V8.75h7v1.75zm-1.25 1.25H3v.75a1 1 0 0 0 1 1h.75zM6 13.5v-1.75h7v.75a1 1 0 0 1-1 1zm0-6V5.75h7V7.5zM3 1H1.5v11.5A2.5 2.5 0 0 0 4 15h8a2.5 2.5 0 0 0 2.5-2.5V1H3"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Notes.displayName = "Notes";

export { Notes };
export default Notes;

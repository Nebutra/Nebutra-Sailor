import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Archive = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1.5 3.5h13v2h-13zM1 7H0V2h16v5h-1v5.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5zm1.5 0v5.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V7zM6 9.5h4V11H6z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Archive.displayName = "Archive";

export { Archive };
export default Archive;

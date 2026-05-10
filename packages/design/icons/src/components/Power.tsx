import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Power = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7.25 8v.75h1.5V0h-1.5v8M2.5 8a5.49 5.49 0 0 1 2.2-4.4l-.901-1.2a7 7 0 1 0 8.402 0l-.9 1.2A5.5 5.5 0 1 1 2.5 8"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Power.displayName = "Power";

export { Power };
export default Power;

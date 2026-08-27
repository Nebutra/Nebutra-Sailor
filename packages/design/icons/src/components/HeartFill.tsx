import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const HeartFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1.394 2.144A4.76 4.76 0 0 1 8 2.024a4.76 4.76 0 0 1 6.606 6.851L8 15.481 1.394 8.875a4.76 4.76 0 0 1 0-6.73"
      />
    </svg>
  ),
);
HeartFill.displayName = "HeartFill";

export { HeartFill };
export default HeartFill;

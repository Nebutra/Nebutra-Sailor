import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Heart = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7.065 3.205a3.26 3.26 0 1 0-4.61 4.61L8 13.36l5.545-5.545a3.26 3.26 0 0 0-4.61-4.61l-.405.405-.53.53-.53-.53zM8 2.023a4.76 4.76 0 0 0-6.606 6.852l6.076 6.076.53.53.53-.53 6.076-6.076A4.76 4.76 0 0 0 8 2.023"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Heart.displayName = "Heart";

export { Heart };
export default Heart;

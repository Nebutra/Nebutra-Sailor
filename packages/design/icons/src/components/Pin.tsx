import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Pin = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="m6.81 1.25-.53.53-.495.496 7.397 3.48.538-.536.53-.53 1.06 1.06-.53.53L11.06 10l4.22 4.22.53.53-1.06 1.06-.53-.53L10 11.06l-3.72 3.72-.53.53-1.06-1.06.53-.53.537-.538-3.481-7.397-.496.495-.53.53L.19 5.75l.53-.53 1.237-1.238.025-.025 1.975-1.975.025-.025L5.22.72l.53-.53zM4.659 3.403 3.403 4.658l3.481 7.397L8.94 10 10 8.94l2.055-2.056z"
      clipRule="evenodd"
    />
  </svg>
));
Pin.displayName = "Pin";

export { Pin };
export default Pin;

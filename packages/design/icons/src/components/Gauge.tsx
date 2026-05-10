import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Gauge = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8.991 1.576a6.5 6.5 0 0 0-5.587 11.02l.53.53-1.06 1.061-.53-.53A8 8 0 0 1 9.966.244zm4.84 3.547a6.5 6.5 0 0 1-1.235 7.473l-.53.53 1.06 1.061.53-.53a8 8 0 0 0 1.15-9.865zM8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2m0 1.5a2.5 2.5 0 0 0 1.98-4.025l3.467-4.334a8 8 0 0 0-1.188-.915l-3.51 4.388A2.5 2.5 0 1 0 8 10.5"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Gauge.displayName = "Gauge";

export { Gauge };
export default Gauge;

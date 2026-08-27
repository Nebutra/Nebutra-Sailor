import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Agents = forwardRef<SVGSVGElement, IconProps>(
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
        d="M3 10.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5m10 0a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5m-10 1.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5m10 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5M8 12a1 1 0 1 1 0 2 1 1 0 0 1 0-2M2.5 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2M8 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2m5.5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2M8 .25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5m0 1.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5M2.5 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2m11 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"
      />
    </svg>
  ),
);
Agents.displayName = "Agents";

export { Agents };
export default Agents;

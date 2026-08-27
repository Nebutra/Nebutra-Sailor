import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Servers = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.5 1.5h-11v3a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1zM15 0H1v4.5A2.5 2.5 0 0 0 3.5 7h9A2.5 2.5 0 0 0 15 4.5V0M2.5 13.5v-3h11v3a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1M1 9h14v4.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 13.5V9m3.75 4.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M8 12.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m2.5-9a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0m-1.75.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Servers.displayName = "Servers";

export { Servers };
export default Servers;

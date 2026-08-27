import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const VercelAgent = forwardRef<SVGSVGElement, IconProps>(
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
        d="M2 11.643a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m4 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m4 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m4 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M4 8.179a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m4 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m4 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M6 4.714a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m4 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M8 1.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5"
      />
    </svg>
  ),
);
VercelAgent.displayName = "VercelAgent";

export { VercelAgent };
export default VercelAgent;

import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Traces = forwardRef<SVGSVGElement, IconProps>(
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
      <g stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="square"
          d="M4.75.75h-2a2 2 0 0 0-2 2v2M11.25 15.25h2a2 2 0 0 0 2-2v-2M11.25.75h2a2 2 0 0 1 2 2v2M4.75 15.25h-2a2 2 0 0 1-2-2v-2"
        />
        <path strokeLinecap="round" d="M4.5 5h5M7.5 8h5M4.5 11h5" />
      </g>
    </svg>
  ),
);
Traces.displayName = "Traces";

export { Traces };
export default Traces;

import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FunctionNode = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_1534_28976)">
        <path
          fill="transparent"
          stroke="currentColor"
          strokeWidth={1.5}
          d="M15.25 8V2.25a1.5 1.5 0 0 0-1.5-1.5H2.25a1.5 1.5 0 0 0-1.5 1.5v11.5a1.5 1.5 0 0 0 1.5 1.5H8"
          style={{
            stroke: "currentColor",
            strokeOpacity: 1,
          }}
        />
        <path
          stroke="currentColor"
          strokeLinecap="square"
          strokeWidth={1.5}
          d="M9.246 4.25v0A2.246 2.246 0 0 0 7 6.496v3.008a2.246 2.246 0 0 1-2.246 2.246v0M5.25 7.75h3.5"
          style={{
            stroke: "currentColor",
            strokeOpacity: 1,
          }}
        />
        <path
          fill="#46A758"
          d="m13 9 3 1.75v3.5L13 16l-3-1.75v-3.5z"
          style={{
            fill: "color(display-p3 .2745 .6549 .3451)",
            fillOpacity: 1,
          }}
        />
      </g>
    </svg>
  ),
);
FunctionNode.displayName = "FunctionNode";

export { FunctionNode };
export default FunctionNode;

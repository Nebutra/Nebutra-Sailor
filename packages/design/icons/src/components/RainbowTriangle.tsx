import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const RainbowTriangle = forwardRef<SVGSVGElement, IconProps>(
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
        stroke="#E5484D"
        strokeWidth={1.5}
        d="m9 7 3.5-4.5"
        style={{
          stroke: "color(display-p3 .898 .2824 .302)",
          strokeOpacity: 1,
        }}
      />
      <path
        stroke="#52AEFF"
        strokeWidth={1.5}
        d="m10.5 9.5 5.25 1"
        style={{
          stroke: "color(display-p3 .3216 .6824 1)",
          strokeOpacity: 1,
        }}
      />
      <path
        stroke="#45DEC4"
        strokeWidth={1.5}
        d="m10 8 5.75-2"
        style={{
          stroke: "color(display-p3 .2706 .8706 .7686)",
          strokeOpacity: 1,
        }}
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M6.146 3.566 7 2l.854 1.566 4.328 7.934L13 13H1l.818-1.5 1.5-2.75H0v-1.5h4.136zM3.526 11.5 7 5.132l3.473 6.368z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
RainbowTriangle.displayName = "RainbowTriangle";

export { RainbowTriangle };
export default RainbowTriangle;

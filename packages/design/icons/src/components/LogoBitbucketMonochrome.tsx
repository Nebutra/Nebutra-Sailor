import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoBitbucketMonochrome = forwardRef<SVGSVGElement, IconProps>(
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
        d="M15.217 1.044A.5.5 0 0 0 15.013 1L.987 1.003a.47.47 0 0 0-.37.173.5.5 0 0 0-.11.405l1.245 7.936-.597-3.813h9.237l-.846 4.587 3.689 4.544-.002.003a.7.7 0 0 0 .22-.404l2.04-12.855a.52.52 0 0 0-.11-.406.5.5 0 0 0-.166-.129M3.027 15H3.02z"
        clipRule="evenodd"
        style={{
          fill: "currentColor",
          fillOpacity: 1,
        }}
      />
      <mask
        id="mask0_3908_2351"
        width={13}
        height={10}
        x={1}
        y={5}
        maskUnits="userSpaceOnUse"
        style={{
          maskType: "alpha",
        }}
      >
        <path
          fill="url(#paint0_linear_3908_2351)"
          d="M1.155 5.704h4.51l.757 4.587h3.124l3.689 4.544a.64.64 0 0 1-.42.165h-9.79a.47.47 0 0 1-.316-.117.5.5 0 0 1-.165-.302z"
        />
      </mask>
      <g mask="url(#mask0_3908_2351)">
        <path
          fill="currentColor"
          d="M1.155 5.704h4.51l.757 4.587h3.124l3.689 4.544a.64.64 0 0 1-.42.165h-9.79a.47.47 0 0 1-.316-.117.5.5 0 0 1-.165-.302z"
          style={{
            fill: "currentColor",
            fillOpacity: 1,
          }}
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_3908_2351"
          x1={0.112}
          x2={7.774}
          y1={6.989}
          y2={12.75}
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset={0.18}
            stopOpacity={0.4}
            style={{
              stopColor: "black",
              stopOpacity: 0.4,
            }}
          />
          <stop
            offset={1}
            style={{
              stopColor: "black",
              stopOpacity: 1,
            }}
          />
        </linearGradient>
      </defs>
    </svg>
  ),
);
LogoBitbucketMonochrome.displayName = "LogoBitbucketMonochrome";

export { LogoBitbucketMonochrome };
export default LogoBitbucketMonochrome;

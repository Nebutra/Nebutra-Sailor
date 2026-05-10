import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoBitbucketColor = forwardRef<SVGSVGElement, IconProps>(
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
        fill="#2684FF"
        d="M15.013 1a.47.47 0 0 1 .37.173.5.5 0 0 1 .11.406l-2.04 12.855a.7.7 0 0 1-.22.404.64.64 0 0 1-.419.162H3.027a.47.47 0 0 1-.315-.117.5.5 0 0 1-.166-.302l-2.04-13a.52.52 0 0 1 .11-.405.48.48 0 0 1 .37-.173zm-8.59 9.29h3.123l.846-4.586H5.665z"
      />
      <path
        fill="url(#paint0_linear_872_3184)"
        d="M1.155 5.704h4.51l.757 4.587h3.124l3.689 4.544a.64.64 0 0 1-.42.165h-9.79a.47.47 0 0 1-.316-.117.5.5 0 0 1-.165-.302z"
      />
      <defs>
        <linearGradient
          id="paint0_linear_872_3184"
          x1={0.112}
          x2={7.774}
          y1={6.989}
          y2={12.75}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.18} stopColor="#0052CC" />
          <stop offset={1} stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </svg>
  ),
);
LogoBitbucketColor.displayName = "LogoBitbucketColor";

export { LogoBitbucketColor };
export default LogoBitbucketColor;

import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoMastercard = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_4898_1881)">
        <path
          fill="#000"
          d="M0 0h16v16H0z"
          style={{
            fill: "#000",
            fillOpacity: 1,
          }}
        />
        <path
          fill="#EB001B"
          d="M6.045 10.933a2.934 2.934 0 1 0 0-5.867 2.934 2.934 0 0 0 0 5.867"
          style={{
            fill: "color(display-p3 .9216 0 .1059)",
            fillOpacity: 1,
          }}
        />
        <path
          fill="#F79E1B"
          d="M9.956 10.933a2.933 2.933 0 1 0 0-5.867 2.933 2.933 0 0 0 0 5.867"
          style={{
            fill: "color(display-p3 .9686 .6196 .1059)",
            fillOpacity: 1,
          }}
        />
        <path
          fill="#FF5F00"
          d="M8 10.187A2.93 2.93 0 0 0 8.978 8 2.93 2.93 0 0 0 8 5.813 2.93 2.93 0 0 0 7.022 8 2.92 2.92 0 0 0 8 10.187"
          style={{
            fill: "color(display-p3 1 .3725 0)",
            fillOpacity: 1,
          }}
        />
      </g>
      <defs>
        <clipPath id="clip0_4898_1881">
          <rect
            width={16}
            height={16}
            fill="#fff"
            rx={2}
            style={{
              fill: "#fff",
              fillOpacity: 1,
            }}
          />
        </clipPath>
      </defs>
    </svg>
  ),
);
LogoMastercard.displayName = "LogoMastercard";

export { LogoMastercard };
export default LogoMastercard;

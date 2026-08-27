import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoVisa = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_4898_1862)">
        <path
          fill="#1434CB"
          d="M0 0h16v16H0z"
          style={{
            fill: "color(display-p3 .0784 .2039 .7961)",
            fillOpacity: 1,
          }}
        />
        <path
          fill="url(#paint0_linear_4898_1862)"
          d="M9.708 4.444 7.86 9.22l-.77-4.063c-.103-.457-.462-.712-.821-.712H3.607l-.051.204c.616.152 1.079.304 1.49.508.127.064.234.177.299.66l1.334 5.74h1.899l2.978-7.112z"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_4898_1862"
          x1={68.172}
          x2={69.557}
          y1={96.448}
          y2={40.873}
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset={1}
            stopColor="#fff"
            style={{
              stopColor: "white",
              stopOpacity: 1,
            }}
          />
        </linearGradient>
        <clipPath id="clip0_4898_1862">
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
LogoVisa.displayName = "LogoVisa";

export { LogoVisa };
export default LogoVisa;

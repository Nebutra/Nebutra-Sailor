import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LayoutShift = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_4769_1958)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M2.25 14.5H3V16h-.75A2.25 2.25 0 0 1 0 13.75V12.5h1.5v1.25c0 .414.336.75.75.75m1.75 0h2V16H4zM6 0H4v1.5h2zM1.5 2.25V3.5H0V2.25A2.25 2.25 0 0 1 2.25 0H3v1.5h-.75a.75.75 0 0 0-.75.75m0 9.25v-3H0v3zm0-7v3H0v-3zm5 9.25A2.25 2.25 0 0 0 8.75 16h5A2.25 2.25 0 0 0 16 13.75V2.25A2.25 2.25 0 0 0 13.75 0h-5A2.25 2.25 0 0 0 6.5 2.25zm2.25.75a.75.75 0 0 1-.75-.75V2.25a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 .75.75v11.5a.75.75 0 0 1-.75.75z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="clip0_4769_1958">
          <path
            fill="#fff"
            d="M0 0h16v16H0z"
            style={{
              fill: "#fff",
              fillOpacity: 1,
            }}
            transform="rotate(-90 8 8)"
          />
        </clipPath>
      </defs>
    </svg>
  ),
);
LayoutShift.displayName = "LayoutShift";

export { LayoutShift };
export default LayoutShift;

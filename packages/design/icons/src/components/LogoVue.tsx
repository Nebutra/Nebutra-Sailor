import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoVue = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_872_3155)">
        <path fill="#41B883" d="m9.72.917-1.848 3.2-1.848-3.2H-.128l8 13.856 8-13.856z" />
        <path fill="#34495E" d="m9.72.917-1.848 3.2-1.848-3.2H3.072l4.8 8.314 4.8-8.314z" />
      </g>
      <defs>
        <clipPath id="clip0_872_3155">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
LogoVue.displayName = "LogoVue";

export { LogoVue };
export default LogoVue;

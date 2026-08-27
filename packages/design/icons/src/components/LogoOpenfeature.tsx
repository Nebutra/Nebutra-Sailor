import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoOpenfeature = forwardRef<SVGSVGElement, IconProps>(
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
        d="M10.439 12.156H5.56a4.44 4.44 0 0 1-3.07-1.217A4.07 4.07 0 0 1 1.219 8c0-1.102.457-2.16 1.272-2.939a4.44 4.44 0 0 1 3.07-1.217h4.878c1.151 0 2.256.438 3.07 1.217A4.07 4.07 0 0 1 14.781 8c0 1.102-.457 2.16-1.272 2.939a4.44 4.44 0 0 1-3.07 1.217m.019-7.218c-.633 0-1.252.18-1.778.516a3.1 3.1 0 0 0-1.178 1.374 2.94 2.94 0 0 0-.182 1.77c.124.593.428 1.139.876 1.567.447.428 1.017.72 1.638.838.62.118 1.263.057 1.848-.174A3.17 3.17 0 0 0 13.117 9.7a2.947 2.947 0 0 0 .295-2.874 3.1 3.1 0 0 0-.694-.995 3.2 3.2 0 0 0-1.04-.663 3.3 3.3 0 0 0-1.227-.23z"
      />
    </svg>
  ),
);
LogoOpenfeature.displayName = "LogoOpenfeature";

export { LogoOpenfeature };
export default LogoOpenfeature;

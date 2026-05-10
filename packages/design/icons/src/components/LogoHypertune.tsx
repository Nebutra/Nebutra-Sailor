import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoHypertune = forwardRef<SVGSVGElement, IconProps>(
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
        d="M10.86 0A5.14 5.14 0 0 1 16 5.14v5.72A5.14 5.14 0 0 1 10.86 16H5.14A5.14 5.14 0 0 1 0 10.86V5.14A5.14 5.14 0 0 1 5.14 0zm1.776 8.74a.374.374 0 0 0-.53 0l-3.271 3.27a.376.376 0 0 0 .531.531l3.27-3.27a.375.375 0 0 0 0-.53m-.038-5.204a.375.375 0 0 0-.53 0L3.683 11.92a.375.375 0 0 0 .53.53l8.384-8.385a.374.374 0 0 0 0-.529M4.253 3.35a1 1 0 1 0 .001 1.999 1 1 0 0 0-.001-2"
      />
    </svg>
  ),
);
LogoHypertune.displayName = "LogoHypertune";

export { LogoHypertune };
export default LogoHypertune;

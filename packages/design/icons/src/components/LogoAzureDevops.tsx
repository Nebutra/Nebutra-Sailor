import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoAzureDevops = forwardRef<SVGSVGElement, IconProps>(
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
        fill="#0078D4"
        d="M16 2.997V12.5L12 16l-6-2v1.98L2 11.5l10 1v-9zM12 3.5 7 0v2.287L1.5 4 0 5.565V10.5l2 1V5.565z"
      />
    </svg>
  ),
);
LogoAzureDevops.displayName = "LogoAzureDevops";

export { LogoAzureDevops };
export default LogoAzureDevops;

import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoV0 = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6.095 9.464v-3.94H7.62v5.024c0 .591-.48 1.071-1.071 1.071-.283 0-.562-.109-.762-.31L0 5.525h2.155zm9.905.631h-1.524V6.607l-3.488 3.488h3.488v1.524h-3.952A2.143 2.143 0 0 1 8.38 9.476V5.524h1.524v3.5l3.5-3.5h-3.5V4h3.952C15.041 4 16 4.96 16 6.143z"
      />
    </svg>
  ),
);
LogoV0.displayName = "LogoV0";

export { LogoV0 };
export default LogoV0;

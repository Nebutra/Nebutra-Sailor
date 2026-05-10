import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoReflag = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.833 1C14.478 1 15 1.522 15 2.167v11.666c0 .645-.522 1.167-1.167 1.167H2.167A1.167 1.167 0 0 1 1 13.833V2.167C1 1.522 1.522 1 2.167 1zM2.167 2.167v11.666L13.833 2.167z"
      />
    </svg>
  ),
);
LogoReflag.displayName = "LogoReflag";

export { LogoReflag };
export default LogoReflag;

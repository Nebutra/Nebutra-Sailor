import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Botid = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1.5 10.5v1.75a2.25 2.25 0 0 0 2.25 2.25h1.5V16h-1.5A3.75 3.75 0 0 1 0 12.25V10.5zM16 12.25A3.75 3.75 0 0 1 12.25 16h-1.5v-1.5h1.5a2.25 2.25 0 0 0 2.25-2.25V10.5H16zM8 2a1.125 1.125 0 0 1 .75 1.961v1.046A4.5 4.5 0 0 1 13 9.5V12a1 1 0 0 1-.898.995L12 13H4a1 1 0 0 1-1-1V9.5a4.5 4.5 0 0 1 4.25-4.493V3.961A1.125 1.125 0 0 1 8 2.001m-.5 4.5a3 3 0 0 0-3 3v2h7v-2a3 3 0 0 0-3-3zm-1 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2m3 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2m-4.25-7h-3a.75.75 0 0 0-.75.75V5.5H0V2.25A2.25 2.25 0 0 1 2.25 0h3zm8.5-1.5A2.25 2.25 0 0 1 16 2.25V5.5h-1.5V2.25a.75.75 0 0 0-.75-.75h-3V0z"
      />
    </svg>
  ),
);
Botid.displayName = "Botid";

export { Botid };
export default Botid;

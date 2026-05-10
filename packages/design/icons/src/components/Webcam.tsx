import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Webcam = forwardRef<SVGSVGElement, IconProps>(
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
        fillRule="evenodd"
        d="M2.25 2A2.25 2.25 0 0 0 0 4.25v7.5A2.25 2.25 0 0 0 2.25 14h9.25v-2.625l3 1.75L16 14V2l-1.5.875-3 1.75V2H2.25m9.25 4.362v3.276l3 1.75V4.612zM10 5.5v-2H2.25a.75.75 0 0 0-.75.75v7.5c0 .414.336.75.75.75H10v-7"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Webcam.displayName = "Webcam";

export { Webcam };
export default Webcam;

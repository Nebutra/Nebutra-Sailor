import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const WebcamOff = forwardRef<SVGSVGElement, IconProps>(
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
        d="M0 11.75V2h1.71l8.622 10.777 1.307 1.585.477.578-1.157.955-.477-.579L9.396 14H2.25A2.25 2.25 0 0 1 0 11.75m8.19.75L1.5 4.138v7.612c0 .414.336.75.75.75zM4.75 2h6.75v2.625l3-1.75L16 2v12l-1.5-.875-3.508-2.046A2 2 0 0 1 10 9.35V3.5H4.75zm6.75 7.25V6.362l3-1.75v6.776l-2.752-1.605a.5.5 0 0 1-.248-.432z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
WebcamOff.displayName = "WebcamOff";

export { WebcamOff };
export default WebcamOff;

import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Microphone = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8.501 1.5h-1a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5V3a1.5 1.5 0 0 0-1.5-1.5m-1-1.5a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3V3a3 3 0 0 0-3-3zm-.25 13.209V16h1.5v-2.791a6.76 6.76 0 0 0 5.787-5.022l.187-.726-1.452-.374-.187.726a5.252 5.252 0 0 1-10.17 0l-.187-.726-1.452.374.187.726a6.76 6.76 0 0 0 5.787 5.022"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Microphone.displayName = "Microphone";

export { Microphone };
export default Microphone;

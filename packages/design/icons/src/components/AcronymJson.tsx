import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const AcronymJson = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, width, height, ...props }, ref) => (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      strokeLinejoin="round"
      viewBox="0 0 27 14"
      ref={ref}
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M24 1.25H3c-.69 0-1.25.56-1.25 1.25v9c0 .69.56 1.25 1.25 1.25h21c.69 0 1.25-.56 1.25-1.25v-9c0-.69-.56-1.25-1.25-1.25M3 0A2.5 2.5 0 0 0 .5 2.5v9A2.5 2.5 0 0 0 3 14h21a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 24 0zm16 4h1.441l.215.386L22 6.806V4h1.5v6h-1.441l-.215-.386-1.344-2.42V10H19V4M5.5 8.125V4H7v4.125a1.875 1.875 0 0 1-3.75 0V7.75h1.5v.375a.375.375 0 1 0 .75 0M13 6a2 2 0 0 1 2-2h.75a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2zm2-.5a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h.75a.5.5 0 0 0 .5-.5V6a.5.5 0 0 0-.5-.5zm-5.25.375c0-.207.168-.375.375-.375H11.5V4h-1.375a1.875 1.875 0 0 0 0 3.75.375.375 0 0 1 0 .75H8.5V10h1.625a1.875 1.875 0 0 0 0-3.75.375.375 0 0 1-.375-.375"
        clipRule="evenodd"
      />
    </svg>
  ),
);
AcronymJson.displayName = "AcronymJson";

export { AcronymJson };
export default AcronymJson;

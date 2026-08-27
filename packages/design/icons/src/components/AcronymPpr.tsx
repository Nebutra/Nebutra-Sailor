import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const AcronymPpr = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, width, height, ...props }, ref) => (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      strokeLinejoin="round"
      viewBox="0 0 20 16"
      ref={ref}
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2.5 2.25h15c.69 0 1.25.56 1.25 1.25v9c0 .69-.56 1.25-1.25 1.25h-15c-.69 0-1.25-.56-1.25-1.25v-9c0-.69.56-1.25 1.25-1.25M0 3.5A2.5 2.5 0 0 1 2.5 1h15A2.5 2.5 0 0 1 20 3.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 0 12.5zM14.5 11V9.168c.591.281 1 .884 1 1.582V11H17v-.25c0-.786-.279-1.507-.743-2.068.45-.317.743-.84.743-1.432v-.5A1.75 1.75 0 0 0 15.25 5H13v6zm.75-3.5h-.75v-1h.75a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25M4.5 9v2H3V5h2.25C6.216 5 7 5.784 7 6.75v.5A1.75 1.75 0 0 1 5.25 9zm0-1.5h.75a.25.25 0 0 0 .25-.25v-.5a.25.25 0 0 0-.25-.25H4.5zM9.55 11V9h.75a1.75 1.75 0 0 0 1.75-1.75v-.5A1.75 1.75 0 0 0 10.3 5H8.05v6zm.75-3.5h-.75v-1h.75a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25"
        clipRule="evenodd"
        style={{
          fill: "currentColor",
        }}
      />
    </svg>
  ),
);
AcronymPpr.displayName = "AcronymPpr";

export { AcronymPpr };
export default AcronymPpr;

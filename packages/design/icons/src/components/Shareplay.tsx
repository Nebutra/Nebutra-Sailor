import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Shareplay = forwardRef<SVGSVGElement, IconProps>(
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
        d="M3.5 11.5h-2v-8h13v8h-2.75V13H15a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H1a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3.25v-1.5zm4.708-1.188a.25.25 0 0 0-.416 0l-3.533 5.3a.25.25 0 0 0 .208.388h7.066a.25.25 0 0 0 .208-.389z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Shareplay.displayName = "Shareplay";

export { Shareplay };
export default Shareplay;

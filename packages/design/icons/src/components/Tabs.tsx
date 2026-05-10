import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Tabs = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M13.5 13.5a1 1 0 0 0 1-1V7H9.15a2.5 2.5 0 0 1-2.285-1.485L5.525 2.5H1.5v10a1 1 0 0 0 1 1zm-6.333-11 1.07 2.406a1 1 0 0 0 .913.594h5.35v-3zM13.5 15a2.5 2.5 0 0 0 2.5-2.5V1H0v11.5A2.5 2.5 0 0 0 2.5 15z"
      clipRule="evenodd"
    />
  </svg>
));
Tabs.displayName = "Tabs";

export { Tabs };
export default Tabs;

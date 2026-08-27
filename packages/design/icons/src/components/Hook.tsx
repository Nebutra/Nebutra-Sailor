import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Hook = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M3.5 2.75a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0M4.75 0A2.75 2.75 0 0 0 4 5.396v5.854A4.75 4.75 0 0 0 8.75 16h.5A4.75 4.75 0 0 0 14 11.25V2.44l-1.28 1.28-2.25 2.25-.53.53L11 7.56l.53-.53.97-.97v5.19a3.25 3.25 0 0 1-3.25 3.25h-.5a3.25 3.25 0 0 1-3.25-3.25V5.396A2.751 2.751 0 0 0 4.75 0"
      clipRule="evenodd"
    />
  </svg>
));
Hook.displayName = "Hook";

export { Hook };
export default Hook;

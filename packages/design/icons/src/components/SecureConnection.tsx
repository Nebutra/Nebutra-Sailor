import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SecureConnection = forwardRef<SVGSVGElement, IconProps>(
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
        d="M11 3.75a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0M9.848 5.09a2.75 2.75 0 1 1 1.06 1.06l-4.756 4.76a2.75 2.75 0 1 1-1.06-1.06zM2.5 12.25a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0M3.75 5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5M1 3.75a2.75 2.75 0 1 0 5.5 0 2.75 2.75 0 0 0-5.5 0m10 8.5a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0M12.25 15a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SecureConnection.displayName = "SecureConnection";

export { SecureConnection };
export default SecureConnection;

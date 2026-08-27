import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const UserPasskey = forwardRef<SVGSVGElement, IconProps>(
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
        d="M2 2.75A2.75 2.75 0 0 1 4.75 0h.5A2.75 2.75 0 0 1 8 2.75v.5A2.75 2.75 0 0 1 5.25 6h-.5A2.75 2.75 0 0 1 2 3.25zM4.75 1.5c-.69 0-1.25.56-1.25 1.25v.5c0 .69.56 1.25 1.25 1.25h.5c.69 0 1.25-.56 1.25-1.25v-.5c0-.69-.56-1.25-1.25-1.25zM5 9c-1.42 0-2.728.776-3.408 2.023l-.092.168V12.5H9V14H0v-3.191l.092-.168.183-.336a5.382 5.382 0 0 1 8.655-1.1l-1.003 1.127A3.88 3.88 0 0 0 5 9m11-3a3.25 3.25 0 0 1-2 3l1.5 1.5L14 12l1.5 1.5L14 15l-1 1-1.5-1.5V9A3.25 3.25 0 1 1 16 6m-3.25.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2"
        clipRule="evenodd"
      />
    </svg>
  ),
);
UserPasskey.displayName = "UserPasskey";

export { UserPasskey };
export default UserPasskey;

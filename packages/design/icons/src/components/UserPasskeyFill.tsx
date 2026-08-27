import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const UserPasskeyFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M12.75 2.75a3.25 3.25 0 0 1 1.251 6.251L15.5 10.5 14 12l1.5 1.5L13 16l-1.5-1.5V9.001a3.251 3.251 0 0 1 1.25-6.251M5 7.5a5.38 5.38 0 0 1 4.726 2.805l.182.336.092.168V14H0v-3.191l.092-.168.182-.336A5.38 5.38 0 0 1 5 7.5m7.75-3.25a1 1 0 1 0 0 2 1 1 0 0 0 0-2M5.25 0A2.75 2.75 0 0 1 8 2.75v.5A2.75 2.75 0 0 1 5.25 6h-.5A2.75 2.75 0 0 1 2 3.25v-.5A2.75 2.75 0 0 1 4.75 0z"
      />
    </svg>
  ),
);
UserPasskeyFill.displayName = "UserPasskeyFill";

export { UserPasskeyFill };
export default UserPasskeyFill;

import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const User = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M7.75 0A3.25 3.25 0 0 0 4.5 3.25v.5A3.25 3.25 0 0 0 7.75 7h.5a3.25 3.25 0 0 0 3.25-3.25v-.5A3.25 3.25 0 0 0 8.25 0zM6 3.25c0-.966.784-1.75 1.75-1.75h.5c.966 0 1.75.784 1.75 1.75v.5A1.75 1.75 0 0 1 8.25 5.5h-.5A1.75 1.75 0 0 1 6 3.75zM2.5 14.5v-1.33a4.84 4.84 0 0 1 4.33-2.67h2.34a4.84 4.84 0 0 1 4.33 2.67v1.33zM6.83 9a6.34 6.34 0 0 0-5.761 3.686l-.069.15V16h14v-3.165l-.069-.15A6.34 6.34 0 0 0 9.171 9z"
      clipRule="evenodd"
    />
  </svg>
));
User.displayName = "User";

export { User };
export default User;

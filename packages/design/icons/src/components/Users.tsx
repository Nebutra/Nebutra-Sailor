import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Users = forwardRef<SVGSVGElement, IconProps>(
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
        d="M2.5 3.25A3.25 3.25 0 0 1 5.75 0h.5A3.25 3.25 0 0 1 9.5 3.25v.5A3.25 3.25 0 0 1 6.25 7h-.5A3.25 3.25 0 0 1 2.5 3.75zM5.75 1.5A1.75 1.75 0 0 0 4 3.25v.5c0 .966.784 1.75 1.75 1.75h.5A1.75 1.75 0 0 0 8 3.75v-.5A1.75 1.75 0 0 0 6.25 1.5zm-4.25 13v-1.33a4.84 4.84 0 0 1 4.33-2.67h.34a4.84 4.84 0 0 1 4.33 2.67v1.33zM5.83 9a6.34 6.34 0 0 0-5.761 3.686l-.069.15V16h12v-3.165l-.069-.15A6.34 6.34 0 0 0 6.171 9zm10.101 3.686a6.34 6.34 0 0 0-2.587-2.835l-.75 1.298a4.84 4.84 0 0 1 1.906 2.022V14.5h-1V16H16v-3.165zM11.25 0h-.75v1.5h.75c.966 0 1.75.784 1.75 1.75v.5a1.75 1.75 0 0 1-1.75 1.75h-.75V7h.75a3.25 3.25 0 0 0 3.25-3.25v-.5A3.25 3.25 0 0 0 11.25 0"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Users.displayName = "Users";

export { Users };
export default Users;

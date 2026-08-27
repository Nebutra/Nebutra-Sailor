import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const MenuAlt = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1 2h14v1.5H1zm0 10.5h14V14H1zm.75-5.25H1v1.5h14v-1.5H1.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
MenuAlt.displayName = "MenuAlt";

export { MenuAlt };
export default MenuAlt;

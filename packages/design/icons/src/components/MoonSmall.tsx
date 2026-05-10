import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const MoonSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M12.75 2.5v1.25H14v1.5h-1.25V6.5h-1.5V5.25H10v-1.5h1.25V2.5zM5.505 5.005a4.25 4.25 0 1 0 5.99 5.99 5.75 5.75 0 0 1-5.99-5.99M2.5 8.25a5.75 5.75 0 0 1 3.792-5.408l.96.96a4.25 4.25 0 0 0 5.445 5.445l.96.961A5.752 5.752 0 0 1 2.5 8.25"
        clipRule="evenodd"
      />
    </svg>
  ),
);
MoonSmall.displayName = "MoonSmall";

export { MoonSmall };
export default MoonSmall;

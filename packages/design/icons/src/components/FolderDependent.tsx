import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FolderDependent = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_7556_6045466)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M13.5 3v2h-11V1.5H6l1.333 1c.433.325.96.5 1.5.5zM1 5V0h5.167a1 1 0 0 1 .6.2l1.466 1.1a1 1 0 0 0 .6.2H15V5h1l-.167 1.5-.586 5.276A2.5 2.5 0 0 1 12.762 14H10v-1.5h2.762a1 1 0 0 0 .994-.89l.568-5.11H.166L0 5zm.06 4h5a1 1 0 0 1 1 1v5h-1.5v-3.438L1.59 15.53l-.53.53L0 15l.53-.53L4.5 10.5H1.06z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="clip0_7556_6045466">
          <path fill="currentColor" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
FolderDependent.displayName = "FolderDependent";

export { FolderDependent };
export default FolderDependent;

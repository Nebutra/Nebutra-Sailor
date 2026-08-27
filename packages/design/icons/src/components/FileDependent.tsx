import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FileDependent = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_7556_6043468)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M13 12V6.5H8v-5H3V6H1.5V0h7.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V12a2.5 2.5 0 0 1-2.5 2.5h-2V13h2a1 1 0 0 0 1-1M9.5 2.121 12.379 5H9.5zM1.06 9h5a1 1 0 0 1 1 1v5h-1.5v-3.438L1.59 15.53l-.53.53L0 15l.53-.53L4.5 10.5H1.06z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="clip0_7556_6043468">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
FileDependent.displayName = "FileDependent";

export { FileDependent };
export default FileDependent;

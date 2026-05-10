import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Command = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1 3.75a2.75 2.75 0 0 1 5.5 0V5h3V3.75a2.75 2.75 0 1 1 2.75 2.75H11v3h1.25a2.75 2.75 0 1 1-2.75 2.75V11h-3v1.25A2.75 2.75 0 1 1 3.75 9.5H5v-3H3.75A2.75 2.75 0 0 1 1 3.75M11 5h1.25A1.25 1.25 0 1 0 11 3.75zM9.5 6.5h-3v3h3zm1.5 5.75V11h1.25A1.25 1.25 0 1 1 11 12.25M5 11H3.75A1.25 1.25 0 1 0 5 12.25zm0-7.25V5H3.75A1.25 1.25 0 1 1 5 3.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Command.displayName = "Command";

export { Command };
export default Command;

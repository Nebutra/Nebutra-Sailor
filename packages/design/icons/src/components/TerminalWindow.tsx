import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const TerminalWindow = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5V1m4 10.134.442-.442 2.073-2.073a.875.875 0 0 0 0-1.238L4.442 5.308 4 4.866l-.884.884.442.442L5.366 8 3.558 9.808l-.442.442zm4-1.38h4.373V11H8z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
TerminalWindow.displayName = "TerminalWindow";

export { TerminalWindow };
export default TerminalWindow;

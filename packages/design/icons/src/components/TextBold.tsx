import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const TextBold = forwardRef<SVGSVGElement, IconProps>(
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
        d="M3 1H2v14h8a4 4 0 0 0 2.063-7.428A4 4 0 0 0 9 1zm6 6a2 2 0 1 0 0-4H4v4zM4 9v4h6a2 2 0 1 0 0-4H4"
        clipRule="evenodd"
      />
    </svg>
  ),
);
TextBold.displayName = "TextBold";

export { TextBold };
export default TextBold;

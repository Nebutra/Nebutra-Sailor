import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const TextTitle = forwardRef<SVGSVGElement, IconProps>(
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
        d="M2.5.75a1 1 0 0 0-1 1V3.5H3V2.25h4.25V13.5H6V15h4v-1.5H8.75V2.25h4.5V3.5h1.5V1.75a1 1 0 0 0-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
TextTitle.displayName = "TextTitle";

export { TextTitle };
export default TextTitle;

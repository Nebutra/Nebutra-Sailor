import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const TextUppercase = forwardRef<SVGSVGElement, IconProps>(
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
        d="m2.22 13.215.5-1.71h3.56l.5 1.71.085.29h2.27l.085-.29.5-1.71h3.56l.5 1.71.085.29h1.563l-.208-.711-3-10.255h-1.44L8 12.042 5.22 2.54H3.78l-3 10.255-.208.71h1.563zm10.562-3.41L11.5 5.42l-1.282 4.383zm-7 0H3.218L4.5 5.42z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
TextUppercase.displayName = "TextUppercase";

export { TextUppercase };
export default TextUppercase;

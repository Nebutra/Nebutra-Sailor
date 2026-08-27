import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const TextItalic = forwardRef<SVGSVGElement, IconProps>(
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
        d="M4.25 1H14.5v1.5h-3.953l-3.52 11h4.723V15H1.5v-1.5h3.953l3.52-11H4.25z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
TextItalic.displayName = "TextItalic";

export { TextItalic };
export default TextItalic;

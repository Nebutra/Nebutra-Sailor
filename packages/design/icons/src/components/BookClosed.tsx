import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const BookClosed = forwardRef<SVGSVGElement, IconProps>(
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
        d="M3.75 0A2.25 2.25 0 0 0 1.5 2.25v11.5a2.25 2.25 0 0 0 2.25 2.244H14.5V0H3.75M13 11.494V1.5H3.75a.75.75 0 0 0-.75.75v9.372q.354-.126.75-.128zm-10 2.25c0 .414.336.75.75.75H13v-1.5H3.75a.75.75 0 0 0-.75.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
BookClosed.displayName = "BookClosed";

export { BookClosed };
export default BookClosed;

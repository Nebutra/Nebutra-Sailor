import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const BookOpen = forwardRef<SVGSVGElement, IconProps>(
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
        d="M0 1h5c1.227 0 2.316.589 3 1.5A3.74 3.74 0 0 1 11 1h5v12.75h-5.257a2.25 2.25 0 0 0-1.591.659l-.622.621H7.47l-.622-.621a2.25 2.25 0 0 0-1.59-.659H0V1m7.25 3.75A2.25 2.25 0 0 0 5 2.5H1.5v9.75h3.757c.71 0 1.4.202 1.993.573zm1.5 8.073V4.75A2.25 2.25 0 0 1 11 2.5h3.5v9.75h-3.757c-.71 0-1.4.202-1.993.573"
        clipRule="evenodd"
      />
    </svg>
  ),
);
BookOpen.displayName = "BookOpen";

export { BookOpen };
export default BookOpen;

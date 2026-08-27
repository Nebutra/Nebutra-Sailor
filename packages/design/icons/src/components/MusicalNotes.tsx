import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const MusicalNotes = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6.25 1H5.5v8.401a3 3 0 1 0 1.49 2.349H7V2.5h6.5v4.401a3 3 0 1 0 1.49 2.349H15V1H6.25m4.25 8.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0m-8 2.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0"
        clipRule="evenodd"
      />
    </svg>
  ),
);
MusicalNotes.displayName = "MusicalNotes";

export { MusicalNotes };
export default MusicalNotes;

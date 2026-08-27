import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Prism = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6.146 3.566 7 2l.854 1.566 1.182 2.166 2.872-3.692 1.184.92-3.273 4.208.046.085 5.639-1.961.492 1.416-5.403 1.88.102.186 5.195.99-.28 1.473-3.986-.76.558 1.023L13 13H1l.818-1.5 1.5-2.75H0v-1.5h4.136zM3.526 11.5 7 5.132l3.473 6.368z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Prism.displayName = "Prism";

export { Prism };
export default Prism;

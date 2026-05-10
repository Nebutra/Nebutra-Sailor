import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Play = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="m13.455 7.227-.132-.066L2.5 1.75l-.042-.02-.649-.325-.447-.224A.25.25 0 0 0 1 1.405v13.191a.25.25 0 0 0 .362.223l.447-.224.65-.324.041-.021 10.823-5.411.132-.066.8-.4.298-.15a.25.25 0 0 0 0-.447l-.298-.149zM11.645 8 2.5 3.427v9.146z"
      clipRule="evenodd"
    />
  </svg>
));
Play.displayName = "Play";

export { Play };
export default Play;

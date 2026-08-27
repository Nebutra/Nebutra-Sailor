import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FlagPriority = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1.75 0h.75c2.62 0 4.79 1.313 6.651 2.491l.332.211c.826.525 1.588 1.01 2.348 1.383.852.419 1.64.665 2.419.665l.416 1.374-.416-.624.416.624-.002.001-.003.002-.01.007-.038.025-.137.086a19.33 19.33 0 0 1-2.302 1.193C10.69 8.083 8.644 8.75 6.5 8.75c-1.88 0-2.864.47-3.37.93s-.63.995-.63 1.32v5H1V0zm.75 1.5v6.766c.877-.619 2.166-1.016 4-1.016 1.855 0 3.685-.583 5.076-1.188q.27-.118.512-.232a10 10 0 0 1-.919-.4c-.839-.411-1.676-.944-2.492-1.463L8.35 3.76C6.46 2.562 4.63 1.5 2.5 1.5"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FlagPriority.displayName = "FlagPriority";

export { FlagPriority };
export default FlagPriority;

import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Scroll = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 5.75a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5zm1-2.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5z"
      />
      <path
        fill="currentColor"
        d="M14.25 2.682a.93.93 0 0 0-.932-.932c-.332 0-.482.078-.553.135-.075.059-.153.165-.213.377-.062.218-.091.499-.1.845q-.003.175 0 .343h1.798zM1.847 10.864A2 2 0 0 0 3.75 12.25h3.837c-.174-.412-.265-.882-.307-1.386zm2.335-1.5H8.75v.75c0 .91.128 1.448.318 1.744.143.223.373.392.932.392a.956.956 0 0 0 .956-.956V4.2c0-.322-.013-.754-.004-1.13.01-.388.043-.817.156-1.217l.033-.103H5.63c-.8 0-1.45.65-1.45 1.45zM15.75 4.95h-3.294v6.344c0 1.356-1.1 2.456-2.456 2.456H3.75a3.5 3.5 0 0 1-3.5-3.5v-.886h2.432V3.2A2.95 2.95 0 0 1 5.632.25h7.686a2.43 2.43 0 0 1 2.432 2.432z"
      />
    </svg>
  ),
);
Scroll.displayName = "Scroll";

export { Scroll };
export default Scroll;

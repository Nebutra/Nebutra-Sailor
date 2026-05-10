import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SpeakerVolumeQuiet = forwardRef<SVGSVGElement, IconProps>(
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
        d="M3.744 10.698 3 10.5H1.5v-5H3l.744-.198L8.5 2.585v10.83zM3 4 8.5.857 10 0v16l-1.5-.857L3 12H1a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm10.912 1.647-.354-.662-1.323.707.354.661c.261.49.41 1.05.41 1.647s-.149 1.157-.41 1.647l-.354.661 1.323.707.354-.662A5 5 0 0 0 14.499 8c0-.85-.212-1.651-.588-2.353"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SpeakerVolumeQuiet.displayName = "SpeakerVolumeQuiet";

export { SpeakerVolumeQuiet };
export default SpeakerVolumeQuiet;

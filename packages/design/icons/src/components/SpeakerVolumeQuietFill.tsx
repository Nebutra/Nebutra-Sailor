import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SpeakerVolumeQuietFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M0 5v6a1 1 0 0 0 1 1h2l7 4V0L3 4H1a1 1 0 0 0-1 1m13.912.647-.354-.662-1.323.707.354.661c.261.49.41 1.05.41 1.647s-.149 1.157-.41 1.647l-.354.661 1.323.707.354-.662A5 5 0 0 0 14.499 8c0-.85-.212-1.651-.588-2.353"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SpeakerVolumeQuietFill.displayName = "SpeakerVolumeQuietFill";

export { SpeakerVolumeQuietFill };
export default SpeakerVolumeQuietFill;

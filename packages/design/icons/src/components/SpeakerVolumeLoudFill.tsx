import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SpeakerVolumeLoudFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M0 5v6a1 1 0 0 0 1 1h2l7 4V0L3 4H1a1 1 0 0 0-1 1m14.259-2.04.414.626A7.97 7.97 0 0 1 16 8c0 1.63-.488 3.149-1.327 4.414l-.415.626-1.25-.83.415-.624A6.47 6.47 0 0 0 14.5 8a6.47 6.47 0 0 0-1.078-3.586l-.414-.625zm-2.2 2.025.354.662C12.788 6.349 13 7.15 13 8s-.212 1.651-.588 2.353l-.353.662-1.323-.707.353-.661c.262-.49.411-1.05.411-1.647s-.149-1.157-.41-1.647l-.354-.661z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SpeakerVolumeLoudFill.displayName = "SpeakerVolumeLoudFill";

export { SpeakerVolumeLoudFill };
export default SpeakerVolumeLoudFill;

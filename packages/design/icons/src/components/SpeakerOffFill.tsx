import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SpeakerOffFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.25 1.25 6.052 4.725a.25.25 0 0 1-.11.025H4.178L1.335 3.33l-.67-.336-.671 1.341.67.336 14 7 .671.335.671-1.341-.67-.336-2.086-1.043zM3 11.25h2.943a.25.25 0 0 1 .109.025l7.198 3.475v-1.5L2.76 8h-.01v3c0 .138.112.25.25.25"
        clipRule="evenodd"
      />
      <path
        fill="currentColor"
        d="m6.052 4.725-.327-.675zM13.25 1.25H14V.055l-1.076.52zm-9.073 3.5-.335.67L4 5.5h.177zM1.335 3.33l.336-.672zm-.67-.336L1 2.323l-.67-.335-.336.67zm-.671 1.341L-.677 4l-.335.67.67.336zm.67.336L1 4zm14 7L15 11zm.671.335-.335.671.67.335.336-.67zm.671-1.341.671.335.335-.67-.67-.336zm-.67-.336.335-.67zM13.25 9.286h-.75v.464l.415.207zm-7.198 1.989.326-.676zm7.198 3.475-.326.675 1.076.52V14.75zm0-1.5H14v-.463l-.414-.208zM2.76 8l.336-.67-.159-.08H2.76zm-.01 0v-.75H2V8zm3.628-2.6 7.198-3.475-.652-1.35L5.725 4.05zm-.435.1a1 1 0 0 0 .435-.1l-.653-1.35A.5.5 0 0 1 5.943 4zm-1.766 0h1.766V4H4.177zm.335-1.42L1.671 2.657 1 4l2.842 1.42zM1.671 2.657 1 2.323.33 3.665 1 4zm-1.677 0L-.677 4l1.342.67.67-1.34zm-.336 2.348.671.336L1 4l-.67-.335zm.671.336 14 7L15 11 1 4zm14 7 .671.335.67-1.342L15 11zm1.677 0L16.677 11l-1.342-.67-.67 1.34zm.336-2.348-.671-.336L15 11l.67.335zm-.671-.336-2.086-1.042-.67 1.341L15 11zM12.5 1.25v8.036H14V1.25zM5.943 10.5H3V12h2.943zm.435.1a1 1 0 0 0-.435-.1V12a.5.5 0 0 1-.218-.05zm7.198 3.475-7.198-3.476-.653 1.351 7.199 3.475zM12.5 13.25v1.5H14v-1.5zM2.424 8.67l10.49 5.25.672-1.34-10.49-5.25zm.326.08h.01v-1.5h-.01zM3.5 11V8H2v3zm-.5-.5a.5.5 0 0 1 .5.5H2a1 1 0 0 0 1 1z"
      />
    </svg>
  ),
);
SpeakerOffFill.displayName = "SpeakerOffFill";

export { SpeakerOffFill };
export default SpeakerOffFill;

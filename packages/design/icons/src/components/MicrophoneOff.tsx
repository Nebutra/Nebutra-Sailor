import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const MicrophoneOff = forwardRef<SVGSVGElement, IconProps>(
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
        d="m15.558 15.081-.489-.57-2.56-2.987a6.75 6.75 0 0 0 2.028-3.337l.187-.726-1.452-.374-.187.726a5.25 5.25 0 0 1-1.553 2.572l-1.14-1.33A3.5 3.5 0 0 0 11.5 6.5v-3a3.5 3.5 0 0 0-6.82-1.11L3.07.512l-.489-.57L1.442.92l.489.57 12 14 .488.569zM6 3.931V3.5a2 2 0 1 1 4 0v3c0 .551-.222 1.051-.586 1.414zM1.463 8.187l-.187-.726 1.452-.374.187.726A5.25 5.25 0 0 0 8 11.75h.75V16h-1.5v-2.791a6.76 6.76 0 0 1-5.787-5.022"
        clipRule="evenodd"
      />
    </svg>
  ),
);
MicrophoneOff.displayName = "MicrophoneOff";

export { MicrophoneOff };
export default MicrophoneOff;

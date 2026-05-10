import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoFacebookMessenger = forwardRef<SVGSVGElement, IconProps>(
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
        fill="url(#paint0_radial_4759_1851)"
        d="M8 0C3.494 0 0 3.302 0 7.76c0 2.332.956 4.348 2.512 5.74.13.116.21.28.214.456l.044 1.424a.64.64 0 0 0 .898.566l1.588-.7a.64.64 0 0 1 .428-.032c.73.2 1.506.308 2.316.308 4.506 0 8-3.302 8-7.76S12.506 0 8 0"
      />
      <path
        fill="#fff"
        d="m3.196 10.03 2.35-3.728a1.2 1.2 0 0 1 1.736-.32l1.87 1.402a.48.48 0 0 0 .578-.002l2.524-1.916c.336-.256.776.148.552.506l-2.352 3.726a1.2 1.2 0 0 1-1.736.32l-1.87-1.402a.48.48 0 0 0-.578.002l-2.524 1.916c-.336.256-.776-.146-.55-.504"
      />
      <defs>
        <radialGradient
          id="paint0_radial_4759_1851"
          cx={0}
          cy={0}
          r={1}
          gradientTransform="translate(2.68 16)scale(17.6)"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            stopColor="#09F"
            style={{
              stopColor: "color(display-p3 0 .6 1)",
              stopOpacity: 1,
            }}
          />
          <stop
            offset={0.6}
            stopColor="#A033FF"
            style={{
              stopColor: "color(display-p3 .6275 .2 1)",
              stopOpacity: 1,
            }}
          />
          <stop
            offset={0.9}
            stopColor="#FF5280"
            style={{
              stopColor: "color(display-p3 1 .3216 .502)",
              stopOpacity: 1,
            }}
          />
          <stop
            offset={1}
            stopColor="#FF7061"
            style={{
              stopColor: "color(display-p3 1 .4392 .3804)",
              stopOpacity: 1,
            }}
          />
        </radialGradient>
      </defs>
    </svg>
  ),
);
LogoFacebookMessenger.displayName = "LogoFacebookMessenger";

export { LogoFacebookMessenger };
export default LogoFacebookMessenger;

import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SettingsGearFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M9.5 0h-3l-.274 1.46a.52.52 0 0 1-.348.394 7 7 0 0 0-.722.3.52.52 0 0 1-.526-.033l-1.226-.839-2.122 2.122.84 1.226a.52.52 0 0 1 .032.526 7 7 0 0 0-.3.722.52.52 0 0 1-.394.348L0 6.5v3l1.46.274c.185.034.333.17.394.348q.129.373.3.722c.082.17.074.37-.033.526l-.839 1.226 2.122 2.121 1.226-.838a.52.52 0 0 1 .526-.033q.35.171.722.3c.177.061.314.21.348.394L6.5 16h3l.274-1.46a.52.52 0 0 1 .348-.394q.373-.129.722-.3a.52.52 0 0 1 .526.033l1.226.838 2.121-2.12-.838-1.227a.52.52 0 0 1-.033-.526 7 7 0 0 0 .3-.722.52.52 0 0 1 .394-.348L16 9.5v-3l-1.46-.274a.52.52 0 0 1-.394-.348 7 7 0 0 0-.3-.722.52.52 0 0 1 .033-.526l.838-1.226-2.12-2.122-1.227.84a.52.52 0 0 1-.526.032 7 7 0 0 0-.722-.3.52.52 0 0 1-.348-.394zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SettingsGearFill.displayName = "SettingsGearFill";

export { SettingsGearFill };
export default SettingsGearFill;

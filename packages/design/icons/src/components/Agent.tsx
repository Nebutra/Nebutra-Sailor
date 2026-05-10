import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Agent = forwardRef<SVGSVGElement, IconProps>(
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
      <g fill="currentColor">
        <path d="m1.87 12.709.51.291v1.092H.578l.913-1.599zm2.545-.117v1.5H3.397v-1.5zm2.035 0v1.5H5.432v-1.5zm2.035 0v1.5H7.467v-1.5zm2.035 0v1.5H9.502v-1.5zm2.035 0v1.5h-1.017v-1.5zm2.818 1.5h-1.8v-1.093l.509-.29.377-.216zM3.884 11.329l-.545.954-1.302-.744.546-.954zm10.03.21-1.302.744-.545-.954 1.303-.744zM4.704 9.9l-.274.476-1.302-.744.273-.477zm8.122-.268-1.303.744-.272-.477 1.302-.744zM12.444 8.964l-1.303.744-3.165-5.54-3.164 5.54-1.303-.744 4.467-7.818z" />
        <path d="M12.12 6.256c.914.154 1.79.372 2.382.637.296.132.58.296.803.505.222.21.445.529.445.95 0 .678-.556 1.086-.935 1.298-.44.246-1.03.444-1.693.6-1.338.316-3.149.504-5.122.504s-3.784-.188-5.122-.504c-.663-.156-1.252-.354-1.693-.6-.355-.198-.867-.57-.93-1.174L.25 8.348l.01-.154c.046-.345.24-.612.435-.796.222-.209.507-.373.803-.505.594-.266 1.396-.476 2.31-.63L2.808 8.017a5 5 0 0 0-.696.245q-.1.045-.173.085c.27.145.697.3 1.285.44 1.195.281 2.884.463 4.777.463s3.582-.182 4.777-.464c.587-.138 1.015-.294 1.284-.44a3 3 0 0 0-.172-.084 5.5 5.5 0 0 0-.775-.268z" />
      </g>
    </svg>
  ),
);
Agent.displayName = "Agent";

export { Agent };
export default Agent;

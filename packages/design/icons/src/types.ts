import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { IconProps } from "./components/Accessibility";

/**
 * Geist icon component type — mirrors the shape of lucide-react's `LucideIcon`
 * to ease migration. Use this for `icon: Icon` props on shared UI primitives.
 */
export type Icon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

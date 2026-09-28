"use client";

import { BaseEdge, type EdgeProps, getBezierPath } from "@xyflow/react";

/**
 * The `+` ports sit outside a node's frame (ParaNode), so React Flow would start and end every
 * wire 29px short of the nodes it joins — a line floating in the gap. LibTV's wires touch the
 * frames; this pulls both ends back onto the node edges and draws the same smooth curve.
 */
export const PORT_REACH = 29;

export function ParaEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX: sourceX - PORT_REACH,
    sourceY,
    sourcePosition,
    targetX: targetX + PORT_REACH,
    targetY,
    targetPosition,
    curvature: 0.35,
  });
  return (
    <BaseEdge
      id={id}
      path={path}
      {...(markerEnd ? { markerEnd } : {})}
      {...(style ? { style } : {})}
    />
  );
}

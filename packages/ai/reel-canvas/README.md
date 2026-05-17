# @nebutra/reel-canvas

Reel binding for the **generic** `@nebutra/ui` node-graph editor.

```tsx
"use client";
import { useState } from "react";
import type { ReelGraph } from "@nebutra/reel";
import { ReelCanvas } from "@nebutra/reel-canvas";

export function MyReelEditor({ seed }: { seed: ReelGraph }) {
  const [graph, setGraph] = useState(seed);
  return <ReelCanvas graph={graph} onChange={setGraph} />;
}
```

## Why this package exists

`@nebutra/ui` is a generic component library. It must not depend on a domain
feature package. So `NodeGraphCanvas` in `@nebutra/ui` is generic over the
neutral `@nebutra/graph-model` contract and takes the domain bits as props
(`edgeIdentity`, `makeEdge`, `renderNode`).

`@nebutra/reel-canvas` is the composition layer that supplies those for reel:

- `reelEdgeIdentity` — stable `e:from->to:inputType` identity
- `reelMakeEdge` — connection → `ReelEdge` (target handle = input port)
- reel node-type → Geist icon + label presentation
- `withReelTimestamp` — re-stamps `updatedAt` on every accepted mutation

Dependency direction is correct: `reel-canvas → (@nebutra/ui, @nebutra/reel)`;
neither of those depends on the other. See
`docs/capabilities/canvas/ANTI_PATTERNS.md`.

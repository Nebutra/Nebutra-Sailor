# flowith.canvas-quant — how a Neo Agent run looks on the canvas

**Answer to the key PARA question (O):** the agent plan is *projected as canvas nodes*, not shown in a separate panel.

```
prompt (Me) -> step-label -> [Group 1: 6 parallel research nodes]
            -> step-label -> doc node (v1.0.0)
            -> step-label -> doc node (v2.1.0)
            ... x10 steps ...
            -> step-label -> Sandbox Preview node (flo.fun webpage)
```

- Step-label nodes are small bars carrying the subtask sentence; each has Rerun · Edit · Delete.
- Parallelism = a named **Group** container of sibling nodes; sequence = vertical chain. "Powered by Neo" badge on the run.
- Outputs are first-class nodes (documents with version strings, a sandbox/website node) and stay selectable/quotable like any other node.
- Not observed: approval gate before execution, in-progress rendering, cancel (U).

Evidence: `evidence/canvas.quant.overview.webp`, `canvas.quant.fit.webp`, `canvas.quant.step-node-selected.webp`, `canvas.quant.bottom.webp`.

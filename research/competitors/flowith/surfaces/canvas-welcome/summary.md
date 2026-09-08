# flowith.canvas-welcome — /conv/<uuid> (tutorial flow, 34 nodes)

**What the canvas is (O).** A React Flow tree. Every generation is a node; every node has a parent edge (dashed). Prompt nodes ('Me') fan out to one or many answer nodes; answer/image nodes carry the producing model id and date in their footer. Assets live in Supabase storage. Zoom, positions and new nodes persist server-side across reload.

**Selection = context (O).** Clicking a node opens its toolbar *and* pushes it into the bottom composer as a removable token ("Focus node …"). Tokens accumulate; the composer expands to show the mode strip (Chat/Image/Video/Slides/Website/Auto·Neo Agent). Settings names this "Node Interaction Mode: Quote first". Selection is a reference, not a modal edit state.

**Type-specific toolbars (O).**
| node | toolbar |
|---|---|
| prompt (Me) | colour tags · Copy Content · Delete |
| answer (text) | colour tags · Rerun · Copy Content · Edit (E, **paid**) · Delete |
| image | Crop · Upscale▾ · Background Removal · Vary▾ · Rerun · Copy Content · Download · Delete |
| any | + Add node handle · Follow Up (F) = "Branch node" |

**Follow Up (O).** Highlights the ancestor chain, creates a draft prompt node bound to "Follow-up with N nodes", and pre-fills the composer with that lineage token in the matching mode (Image for an image node). Persisted after reload.

**Vary (O).** A node-anchored mini form: batch (1X only on Free), ratio, top-model shortlist, one-line cost text, Cancel/Run — generation config is projected next to the source node rather than in a global panel.

**Chrome (O).** Title bar (logo menu · flow switcher · Share · Comment · Minimize) · Organize Nodes · zoom menu · Composer menu; left dock (Free Node → Text/Upload · Search Node · Media History drawer · Knowledge Garden modal). Pane right-click: Paste · Organize · zoom. Sidebar collapses on entering a flow; chrome ≈ 12 %, ≈ 5 % when minimized.

**Scope of the two docks.** Media History (dock) = generations in this flow (empty here — I2). Knowledge Garden = account-level modal (O).

**Gaps (U).** Node context menu; drag/edge creation from the + handle; Organize Nodes result; multi-select; Upscale options; Composer semantics.

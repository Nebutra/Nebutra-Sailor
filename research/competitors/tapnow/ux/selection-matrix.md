# TapNow selection matrix (tier O unless marked)

| Context | Selectable entity | Gesture | What appears | What disappears | Evidence |
|---|---|---|---|---|---|
| Canvas | one node | single click | floating toolbar, title input, generation bar, Reference handle, composer context chips | — | canvas.node.text-selected.webp |
| Canvas | none | click empty pane | — | toolbar, bar, chips | canvas.overview.webp |
| Canvas | node | right-click | context menu Copy/Paste/Duplicate/Delete/Report an issue | — | raw/canvas.dom.txt |
| Canvas | pane | right-click | Upload / Add Assets / Add Nodes / Add Utilities / Undo / Redo / Paste | — | canvas.context-menu.webp |
| Canvas | multi-node | marquee / shift-click | U (not exercised; react-flow default a11y text mentions selecting nodes/edges) | | |
| Canvas | edge | click | U ("Press enter or space to select an edge… delete") | | home.hero.webp (RF a11y text) |
| History drawer | outputs (multi) | Select → tick | bulk bar "N selected", Apply to Canvas, Download, Cancel | | canvas.dock.history.webp |
| Library | asset | click | U (empty library) | | canvas.library.private.webp |
| Workspace | project card | hover ⋯ / "Select" item | card menu; Select = multi-select mode (I2) | | app.workspace.project-menu.webp |
| Agent composer | context chips | selection-driven; × removes | chip with thumbnail | | canvas.node.image.tool-change-angle.webp |
| Image node (Redraw) | mask region | Brush / Marquee / Eraser | mask + prompt + model + cost | | canvas.node.image.tool-redraw.webp |
| Image node (Change Angle) | cube face BK/L/R/T/B | drag / click | rotation/tilt/scale values | | canvas.node.image.tool-change-angle.webp |
| Approval card | none (params rendered as buttons) | click model/ratio/res | I2 editable before Confirm | | canvas.agent.approval.webp |

Selection semantics summary (I2): single-node selection is the unit of both manual generation and agent context; the "Reference" handle plus edges are how one node's output becomes another's input.

# tapnow.workspace — /canvas/projects

- Tabs **Private** | **Team Projects** (`?scope=team`). Search, filter/sort popover (Show All / Collections / Projects · Last modified / Date created · Newest / Oldest), Grid/List toggle, **+ New Project**.
- Project card hover menu: Open / Rename / Select / Move to... / Share by link / Move to team / Delete; inline rename pencil on title.
- Objects implied: Project, Collection (folder), Team. Team empty state: "Create new projects in the team, or move private projects to the team".
- Project cards open `/canvas/<uuid>` (in a new window from this list; direct route works).
- Caveat: list often stayed in skeleton state in a background tab (U whether visibility-gated fetch).
- Evidence: `app.workspace.private.webp`, `app.workspace.project-menu.webp`, `app.workspace.team.webp`.

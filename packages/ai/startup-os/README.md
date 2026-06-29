# @nebutra/startup-os

Status: WIP — Not yet integrated into any production app.

`@nebutra/startup-os` owns the typed Startup OS orchestration contracts used by
the dashboard: company context compilation, founder conversation streaming,
execution/run state, generated files, canvas state, rollout gates, and model-tier
selection.

The package is intentionally not a production surface by itself. Hosted
execution, route-level auth, persistence wiring, and UI delivery remain app-owned
until the Startup OS runtime is fully integrated.

# Persistence boundaries — Flowith (O unless noted)

- **Flow** is the persistence unit: server-side, listed in History and /flows, reopened by route; title, nodes, edges, comments, share state, viewport zoom all survive reload (zoom 25% restored; node count 33→34 kept).
- **Node** persists as soon as it exists — including a Follow-Up draft prompt node and a failed answer node.
- **Assets** live in Supabase public storage (`aibdxsebwhalbnugsqel.supabase.co/storage/.../user_assets/<user>/...`).
- **Media History** is account-level (/gallery by day) with a flow-scoped view in the canvas drawer (I2).
- **Knowledge Garden** is account-level and shareable/marketable; independent of flows.
- **Client-side prefs** (localStorage): last chat mode, preferred model per mode, cached model catalog with 24h expiry key (`global_models_expire`).
- **Theme**: setting "System" → follows OS.
- Unknown: soft-delete/trash for flows, node history/versions, whether an in-flight job survives navigation (U).

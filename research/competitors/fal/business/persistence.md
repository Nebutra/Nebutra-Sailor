# fal — persistence
- **O (documented)** Request payloads (input+output JSON) kept 30 days by default → powers Requests tab and Recent History; `X-Fal-Store-IO: 0` opts out; deletion only after completion, input CDN files never deleted (may be shared).
- **O (documented)** Generated media on fal CDN (`v3b.fal.media`) as public URLs; expiration + ACL via `X-Fal-Object-Lifecycle-Preference`; "download before it expires".
- **O** UI persistence: /assets (All media, Collections, Favorites, Entities) auto-collects generations; Favorite / Add to Collection / Link character on a result; Share permalink `?share=<requestId>`; Examples tab = curated prior requests.
- **O** History is keyed by request id at two scopes (per model, global) and filtered by outcome bucket.
- **I2** Entities (Characters/Props/Environments/Styles/Scenes) are reusable identities referenced with `@` in prompts and linked from results.
- **O** Sandbox generations feed has search, filter and metadata toggle (empty here).

# browser-control Capability Map

## Depends On

- `sandbox-runtime`
- `tool-protocol`
- `trace-store`

## Decision Matrix

| Decision | Sailor landing | Notes |
| --- | --- | --- |
| SKIP | agent loop ownership | Browser execution does not own Thread, Turn, Item, prompts, or sub-agent routing. |
| WRAP | first-run browser executor | The package exposes a `BrowserExplorer` port and records actions returned by the executor. |
| WRAP | deterministic browser driver | The package exposes open, act, extract, observe, and replay ports. The zero-config driver supports deterministic public-page observation. |
| PORT | recording and replay cache | Recordings are stored under `.nebutra/browser-control/<tenant>` and replayed through the deterministic driver. |

## Public Contract

- `BrowserControl.task()` executes a browser objective with explicit tenant context.
- `BrowserControl.replay()` replays a saved action recording.
- `BrowserControl.open()` starts a deterministic browser session for low-level act/extract/observe work.
- `JsonBrowserRecorder` is the content-addressable boundary for replay inputs.

## Boundary Rules

- No agent loop is implemented here.
- Browser profiles and recordings are tenant scoped.
- Mutating DOM actions must go through a configured browser sidecar.
- The local HTTP driver is read-only and exists for deterministic public-page extraction.

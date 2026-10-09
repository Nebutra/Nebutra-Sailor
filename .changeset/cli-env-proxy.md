---
"nebutra": patch
---

Honour `HTTPS_PROXY` / `HTTP_PROXY` (and `NO_PROXY`) for every request. Node's fetch ignored them, so behind a proxy each command failed with a bare "fetch failed" while curl to the same URL worked.

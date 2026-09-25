---
"nebutra": minor
---

Add `nebutra login` (RFC 8628 device authorization) and `nebutra whoami`. `login` requests a
device code from the auth center, opens a browser for the user to confirm it, and stores the
resulting session in the OS keychain (falling back to `~/.config/nebutra/credentials.json`,
mode 0600). `login --json` prints the verification link/code and exits immediately without
blocking — for agents; `login --poll` resumes and blocks to completion. `NEBUTRA_TOKEN`
overrides stored credentials for CI. `logout` now also clears the keychain entry and any
pending device-code state.

# Extensions

Status: IMPLEMENTED IN SOURCE / NATIVE RUNTIME NOT VERIFIED.

Implemented:
- unpacked extension installation
- manifest parsing
- extension metadata persistence
- enable/disable
- remove
- profile-scoped extension storage
- extension permissions surfaced in the manager UI
- explicit Chrome Web Store compatibility disclosure

Pending native-runtime verification:
- Chromium extension process/runtime integration
- content scripts
- service workers
- isolated extension worlds
- extension storage APIs
- extension permission prompts
- update lifecycle
- Chrome Web Store compatibility
- extension security regression tests

Extension code must never receive unrestricted native privileges.

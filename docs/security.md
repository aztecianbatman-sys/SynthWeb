# Security status

Implemented in source:
- URL validation and HTTP(S)-only external navigation policy
- no arbitrary shell IPC from webpages
- no native filesystem access granted directly to webpage content
- profile-scoped SQLite and runtime data directories
- private-tab separation through the concrete runtime's incognito/private mode
- collision-safe download filenames
- downloads do not auto-open
- HTTPS-only policy
- per-origin permission storage and history
- cookie and current-site storage inspection/deletion
- category-based browser-data clearing
- first-party-isolation policy setting
- autofill privacy setting
- native Synth Shield URL throttling in Azecotron source
- tracker rule loading and measured blocked-request events
- strict cross-origin Cookie header stripping in the native throttle
- signed update-manifest Ed25519 verification primitive
- profile integrity hashing and verification

Still requires runtime verification:
- pinned Chromium sandbox behavior on Windows
- native Chromium permission prompts and device selection
- native download manager behavior
- complete Chromium extension isolation
- real DevTools frontend/DevToolsAgentHost integration
- fingerprinting mitigations at Chromium runtime level
- complete HTTPS upgrade implementation at the network stack
- long-session/security regression testing

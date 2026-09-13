# Synth Browser v0.1.0 status

The implementation follows the master prompt incrementally. Statuses below describe source-level implementation, not unverified marketing claims.

## FUNCTIONAL IN SOURCE
- Rust + Tauri native application shell
- sparse browser chrome and New Tab
- real child webview navigation
- real tabs, activation, close, reopen
- drag-and-drop tab reorder
- pin/unpin command and tab context menu
- close other tabs / close tabs right
- private tabs using runtime incognito mode
- real renderer popup requests routed into new browser tabs
- omnibox URL/domain/search classification
- explicit omnibox commands: open, search, zoom, workspace, bookmarks, history
- local tab/history suggestions
- real Back / Forward / Stop / Reload
- real Print
- real page zoom and persisted default zoom
- real browser downloads and persistent download history
- SQLite bookmarks and history
- Reading Shelf
- local workspaces with create/switch/rename/delete/duplicate
- saved sessions
- crash-session metadata and recovery dialog
- local Notes
- local Research Board
- tab overview with search
- command palette
- Page Source viewer
- Find in Page
- deterministic Reader Mode extraction
- deterministic Page Lens extraction
- local query history with a setting and clearing path
- local browser data export
- sanitized diagnostics export
- browser reset
- profile registry with isolated SQLite roots
- per-profile Tauri webview data directories
- disposable Guest Mode profile roots
- native browser permission prompts with persisted allow/deny/ask policies
- theme/accent/density/quiet-mode settings
- HTTPS-only navigation setting
- Site Capsule with actual URL/security/cookie-count data from runtime
- restrictive CSP
- custom Synth Browser mark/logo
- Cortis web/images/news/videos/maps search delegation
- optional Synth Assist via OpenAI-compatible endpoints
- explicit page/selection context permission gates
- OS credential-store API-key storage

## PARTIALLY FUNCTIONAL
- Cortis is a real provider/delegation layer but does not ship its own search index in v0.1.
- Native downloads have persistent metadata, checksum verification, open/reveal/remove-history controls, and browser-host download hooks; pause/resume/retry remain runtime-dependent until native Chromium verification.
- Tab duplication copies real navigation but does not yet preserve every browser-native metadata field.
- New-window requests have application-level handling; complete multi-window Chromium manager verification remains pending.
- Reader Mode is deterministic extraction and does not promise perfect extraction on every site.
- Page Lens reports actual DOM metadata only; advanced semantic/AI interpretation remains optional.
- Synth Assist has provider presets, secure keys, model discovery, streaming-compatible transport, threads, and explicit context controls; individual provider runtime validation remains pending.
- Workspace management is available in the UI and saved-content records can be scoped to the active workspace.

## REMAINING / NOT VERIFIED
- multi-window workspace transfer
- session lazy-loading strategy for very large sessions
- Tab Memory beyond explicit tab metadata
- signed updater with verification/rollback
- localization beyond architecture readiness
- full accessibility manual audit
- measured 10/50/100/200-tab and multi-hour performance suite
- hardware acceleration troubleshooting UI
- measured runtime crash-count/performance certification
- Chromium extension compatibility certification
- production Chromium DevTools docking/detach verification
- native media/PiP/fullscreen verification
- Windows packaged runtime verification

## BLOCKED / EXPLICITLY NOT CLAIMED
### Azecotron Web
Chromium fork workflow is now IMPLEMENTED IN SOURCE.
- Chromium is pinned to 152.0.7977.119 at revision e6333471674f4d3af9f386bfc2e5e4388333b734.
- Downstream patch series is stored under chromium/patches/.
- Windows bootstrap/build scripts use depot_tools, gclient, GN and autoninja.
- A manual self-hosted Windows CI job builds chrome and runs a headless about:blank smoke test.

Still required before marking the runtime VERIFIED:
1. run the Windows build on a real runner;
2. confirm patch application against the pinned source;
3. run Chromium tests and security checks;
4. package the runtime;
5. perform real-site/media/permissions/DevTools/download/crash-isolation smoke testing;
6. integrate the native Chromium Content API behind BrowserRuntime.

### Cortis
Cortis is the branded search layer. v0.1 sends web/image/news/video/maps searches to real Google search endpoints. It does not claim to contain Google's source code or a private Google-scale index.

## TESTING TRUTH
- Frontend JavaScript has been parsed with a real JavaScript parser in the development environment and currently passes syntax parsing.
- Repository-wide source consistency checks confirmed required commands/modules are present.
- Rust/Cargo is unavailable in the current container, so cargo fmt/clippy/test/build have not been executed locally.
- GitHub Actions workflow is configured for Windows rustfmt, clippy, unit tests and Tauri packaging, but no completed CI run has been observed from the connector yet.
- Therefore no installer/executable is marked VERIFIED or TESTED until an actual Windows CI/package run completes.

## Acceptance status against the master prompt
Core browser architecture: IN DEVELOPMENT / native runtime source integrated
Tabs/navigation/omnibox: FUNCTIONAL IN SOURCE
Synt Search delegation: FUNCTIONAL IN SOURCE
Bookmarks/history/downloads: FUNCTIONAL IN SOURCE
Workspaces/sessions/shelf: FUNCTIONAL IN SOURCE
Privacy/security: FUNCTIONAL IN SOURCE for per-site permissions/cookies/site-data/checksum verification; tracker interception PLATFORM LIMITED on current host WebView
Synth Assist: FUNCTIONAL IN SOURCE for provider presets, secure keys, model discovery, streaming-compatible providers, AI history, explicit page/selection context, and AI Search via OpenRouter
Reader/Page Lens/Research: FUNCTIONAL IN SOURCE
Developer Tools / power-user commands: FUNCTIONAL IN SOURCE where host runtime supports them
Profiles: FUNCTIONAL IN SOURCE; Guest Mode: FUNCTIONAL IN SOURCE; native permission prompts: FUNCTIONAL IN SOURCE; extension manager: FUNCTIONAL IN SOURCE; native extension runtime: NOT VERIFIED
Azecotron Web Chromium fork/build workflow: IMPLEMENTED IN SOURCE; Cortis provider transformation: IMPLEMENTED IN SOURCE; Synth-owned ContentMain/BrowserContext stack: IMPLEMENTED IN SOURCE; binary build: NOT VERIFIED
Performance certification: NOT TESTED
Packaging: CONFIGURED, NOT VERIFIED
Release acceptance: NOT YET MET

## Profiles and permissions in this phase

Profiles use separate native profile roots for the SQLite browser database and Tauri webview data directory. Switching profiles relaunches the app into the selected profile so data boundaries are not faked. Guest Mode uses a unique temporary profile root and deletes it on exit.

The current host webview runtime uses real Tauri/Wry permission handling. Sensitive permissions default to Ask through the native permission system; clipboard read, local fonts, and sensors default to Block. Browser policies can be changed in Settings. Full per-site management and Chromium-native permission delegation remain pending the Azecotron runtime integration.

## Phase 7-9 implementation pass

Implemented in this pass:
- per-origin permission overrides and permission history
- current-site cookie inspection and individual cookie deletion
- current-site cookie/localStorage/sessionStorage/IndexedDB clearing
- download SHA-256 verification and verification state
- download open/reveal/remove-history actions
- Find in Page match count, case-sensitive mode, whole-word mode
- selection extraction for Search Selection / Ask Synth / Translate / Add to Notes
- provider presets for Ollama, LM Studio, OpenAI, OpenRouter, Gemini, Anthropic, and custom OpenAI-compatible endpoints
- OpenAI-compatible streaming transport and local AI history
- provider-backed AI Search using OpenRouter online search mode
- real host DevTools open/close/status commands
- Copy URL and Copy Title + URL commands
- TrackerEngine rule/allowlist/blocklist/counter architecture; current external-request interception remains platform-limited by the Tauri host-webview path

Not yet verified: Rust compilation, Windows packaging, Windows Chromium native host compilation, HWND embedding smoke test, Chromium DevTools protocol integration, and full runtime smoke/performance tests.


## Privacy-first onboarding

The first-run experience now opens a four-step wizard covering:
- what Synth Browser stores locally;
- Shielded vs Balanced privacy defaults;
- theme and profile naming;
- final privacy baseline.

Shielded is the default. Its real defaults include search/history memory off, recent activity hidden, AI off, HTTPS-only on, tracker policy enabled where the runtime can enforce it, autofill off, and sensitive permission policies set to Ask or Block.

For existing profiles, Shielded setup offers an explicit cleanup action. When selected, the browser clears local history, search memory, download metadata, site permissions, permission history, AI history, and runtime browsing data. Bookmarks and saved sessions are intentionally retained.

The current Tauri/Wry host does not intercept external web resource requests, so full network-level tracker blocking and third-party cookie policy enforcement remain PLATFORM LIMITED until the Azecotron Chromium network/runtime integration is active. Tauri's current documentation confirms that external URLs are outside the current on_web_resource_request interception path. citeturn920487search1turn920487search5

## Native Azecotron host integration pass

Implemented in source:
- native Chromium ContentMain bootstrap with Windows sandbox initialization
- AzecotronRuntimeHost attached to a real Chromium WebContents
- native WebContents view attachment to the Synth host HWND on Windows
- navigation/load/security/renderer health event emission
- popup/new-WebContents event path
- Rust stdout IPC bridge for native events
- Azecotron process supervision and exit reporting
- explicit native executable path override for packaging
- Tauri Runtime Status detection and launch action
- explicit GN dependency from azecotron_host to the Content API host target

The former Content Shell BrowserContext/BrowserMainParts integration has been removed from the Synth runtime source. Synth now owns the ContentMainDelegate, BrowserMainParts, and BrowserContext seams. Windows compilation and full native runtime smoke testing remain unverified.


## Native ContentMain / network Shield milestone

Implemented in source:
- SynthContentMainDelegate now owns the ContentBrowserClient/client stack.
- SynthBrowserMainParts and SynthBrowserContext provide a named Synth profile context.
- The initial page is created directly with content::WebContents from SynthBrowserContext instead of content::Shell startup.
- AzecotronRuntimeHost owns the primary WebContents and attaches its native view to the Synth host HWND.
- Native navigation/loading/security/renderer events are forwarded through the Synth event pipe.
- Synth Shield is attached to Chromium's browser-side URLLoaderThrottle path.
- Matched tracker subresource requests can be canceled with ERR_BLOCKED_BY_CLIENT.
- Strict mode strips Cookie request headers for cross-origin web requests.
- Tracker block events include a measured session counter for the native runtime.

Still requires a real Windows build before verification:
- compile the pinned Chromium 152 checkout;
- compile the Synth ContentMain stack and native host;
- launch against a real Synth HWND;
- verify navigation/media/download/permissions;
- run tracker-blocking and cookie-isolation tests;
- verify DevToolsAgentHost integration;
- run performance and crash/recovery tests.

The current host WebView2 path remains the fallback browser runtime until those tests pass.


## Production BrowserContext hardening

Implemented in source:
- SynthBrowserContext directly subclasses content::BrowserContext.
- Content Shell BrowserContext dependency removed from the Synth runtime.
- SynthBrowserMainParts directly subclasses content::BrowserMainParts.
- Content Shell BrowserMainParts dependency removed.
- SynthContentMainDelegate owns the Content client stack.
- Azecotron entrypoint bootstraps ContentMain directly.
- First WebContents is created from SynthBrowserContext.
- Native WebContents view is attached to the Synth host HWND.
- Per-tab native observers stream navigation, loading, security, renderer health, and destruction events.
- Synth Shield is attached to Chromium's browser-side URLLoaderThrottle seam.

The production-boundary guard fails the build if content/shell is reintroduced under azecotron/app.

Source status: IMPLEMENTED IN SOURCE.
Verification status: NOT VERIFIED until the pinned Chromium 152 checkout compiles on Windows and the native integration test suite passes.

## Reference UI direction

The New Tab is now intentionally aligned to the approved Synth visual reference:
- compact dark browser chrome with restrained borders;
- left Synth navigation rail;
- centered Cortis search;
- floating Synth Shield capsule on the right;
- dense feature modules below the search area;
- cyan/violet/green accent signals used sparingly;
- real values only; unsupported capabilities display explicit states instead of invented metrics.

The generated UI reference is a design target, not a source of runtime facts. All browser counts and capability states shown by the dashboard are derived from actual Synth state or are explicitly marked NOT VERIFIED / NOT STARTED / PLATFORM LIMITED.


## UI integration pass

Implemented:
- reference-style left Synth navigation rail with collapse/search;
- live right-side Synth Shield capsule;
- live tracker/cookie/permission site telemetry;
- richer Privacy Shield panel with diagnostics and Shielded preset;
- Extensions status panel with explicit Azecotron dependency;
- Media & WebRTC status/policy panel;
- Performance & Reliability verification panel;
- Browser Tools panel for print, screenshot, save/archive, PDF, PiP, fullscreen, WebRTC and media controls;
- truthful runtime/feature capability labels instead of hard-coded claims;
- live native Azecotron tracker counter surfaced in the UI.

Frontend syntax check: PASS. Windows native runtime and Chromium integration remain NOT VERIFIED until the real pinned Chromium build and smoke suite run.


## Feature integration pass - privacy profiles assist

Implemented in the reference UI:
- Privacy Shield posture audit with a real enforceable-policy score and per-check status.
- Expanded per-site permission surface: camera, microphone, location, notifications, display capture, clipboard, local fonts, sensors, MIDI, USB, Bluetooth, downloads, popups, autoplay.
- Profiles redesigned as isolated profile cards with active-profile, guest, and data-isolation information.
- Synth Assist redesigned as a provider/model manager with provider testing, model discovery, secure credential actions, context opt-in controls, AI Search, and local history.
- Browser Tools consolidated into one status surface for print, screenshot, save/archive, PDF, PiP, fullscreen, WebRTC, and media control capabilities.
- Shielded preset now covers the expanded sensitive-permission baseline plus first-party-isolation policy and disabled autofill/search/AI defaults.
- Reference New Tab remains live-data driven and uses explicit NOT VERIFIED / NOT STARTED / PLATFORM LIMITED states.

Native Chromium service integration remains pending Windows verification for production download manager, permission delegate, DevTools manager, media/device services, and full runtime smoke tests.


## Checklist implementation pass
Implemented in source during the current build sweep:
- category-based browser data clearing UI/backend;
- workspace columns and queries for bookmarks and Reading Shelf with safe existing-profile migration;
- profile rename, export, import, and integrity visibility;
- Research Board Markdown/BibTeX citation export;
- extension install/list/enable/disable/remove UI and backend;
- performance sampling and diagnostics UI;
- native permission/download delegates attached to Synth BrowserContext;
- profile privacy-policy serialization passed to Azecotron;
- native tracker throttle with measured block events;

These are source-level implementation claims only. Windows Chromium compilation and full native runtime verification remain separate acceptance gates.


## Current checklist completion pass

Newly source-complete in this pass:
- native DownloadManagerDelegate attached to SynthBrowserContext;
- native PermissionControllerDelegate attached to SynthBrowserContext;
- native DevToolsManagerDelegate attached to SynthContentBrowserClient;
- profile-scoped privacy policy serialization for native Azecotron;
- category-based browser-data clearing;
- profile rename/export/import/integrity UX;
- Research Board Markdown/BibTeX citation export;
- workspace-scoped bookmark/Reading Shelf schema and queries;
- large-session restore safety gate;
- versioned Synth Shield ruleset packaged with native profiles;
- accessibility language/text-scale/reduced-motion/high-contrast preferences;
- signed-update manifest Ed25519 verification primitive and update-security status UI;
- expanded Extensions, Media/WebRTC, Performance, Browser Tools and Privacy surfaces.

Still not verified:
- real Windows Chromium 152 compilation;
- native HWND/runtime smoke;
- full native DevTools frontend/docking;
- native extension runtime compatibility;
- media/PiP/fullscreen verification;
- performance certification;
- signed binary updater transport/rollback;
- manual accessibility certification.

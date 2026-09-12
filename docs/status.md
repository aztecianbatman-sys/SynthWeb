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
- Downloads persist metadata, but pause/resume/retry/reveal/open/remove history actions are not all exposed.
- Tab duplication copies real navigation but does not yet preserve every browser-native metadata field.
- New-window requests remain within the current application flow rather than creating a complete multi-window browser manager.
- Reader Mode is deterministic extraction and does not promise perfect extraction on every site.
- Page Lens reports actual DOM metadata only; advanced semantic/AI interpretation remains optional.
- Synth Assist supports OpenAI-compatible endpoints and secure keys; provider-specific adapters for Ollama/LM Studio/hosted services remain to be validated individually.
- Workspace UI exposes management through contextual interaction; a dedicated polished workspace management surface is still pending.

## DESIGNED / NOT STARTED
- extension manager and extension permission UI
- full site permission center for camera/microphone/location/notifications/etc.
- tracker-blocking rule engine and measured interception counters
- complete cookie/site-storage UI
- full screenshot/page-save/archive flows
- multi-window workspace transfer
- session lazy-loading strategy for very large sessions
- workspace-specific bookmarks/shelf data model
- citation-helper export UI
- Context Threads
- Tab Memory beyond explicit tab metadata
- local command-chain builder/preview UI
- full diagnostics screen
- signed updater with verification/rollback
- localization beyond architecture readiness
- full accessibility audit
- measured 10/50/100/200-tab and multi-hour performance suite
- hardware acceleration troubleshooting UI
- measured runtime crash-count/performance dashboard
- Chromium extension compatibility certification

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
Core browser architecture: IN DEVELOPMENT
Tabs/navigation/omnibox: FUNCTIONAL IN SOURCE
Synt Search delegation: FUNCTIONAL IN SOURCE
Bookmarks/history/downloads: FUNCTIONAL IN SOURCE
Workspaces/sessions/shelf: FUNCTIONAL IN SOURCE
Privacy/security: FUNCTIONAL IN SOURCE for per-site permissions/cookies/site-data/checksum verification; tracker interception PLATFORM LIMITED on current host WebView
Synth Assist: FUNCTIONAL IN SOURCE for provider presets, secure keys, model discovery, streaming-compatible providers, AI history, explicit page/selection context, and AI Search via OpenRouter
Reader/Page Lens/Research: FUNCTIONAL IN SOURCE
Developer Tools / power-user commands: FUNCTIONAL IN SOURCE where host runtime supports them
Profiles: FUNCTIONAL IN SOURCE; Guest Mode: FUNCTIONAL IN SOURCE; native permission prompts: FUNCTIONAL IN SOURCE; extension manager/extension permission UI: NOT STARTED
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

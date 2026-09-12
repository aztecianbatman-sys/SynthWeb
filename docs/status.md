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
- full profile manager and Guest Mode
- per-profile browser data isolation
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
The actual bundled browsing runtime is the host platform webview. On Windows, the target is WebView2. A true Chromium-derived Azecotron Web fork is not bundled in v0.1.0.

Required next milestone:
1. pin an exact Chromium revision;
2. maintain a reproducible patch series;
3. build and test the fork;
4. preserve Chromium sandbox/security updates;
5. add required LICENSE/NOTICE material;
6. integrate it behind BrowserRuntime;
7. verify real sites, media, permissions, DevTools, downloads and crash isolation.

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
Privacy/security: PARTIALLY FUNCTIONAL
Synth Assist: PARTIALLY FUNCTIONAL
Reader/Page Lens/Research: FUNCTIONAL IN SOURCE
Profiles/extensions/advanced permissions: NOT STARTED
Azecotron Web Chromium fork: BLOCKED / DESIGNED
Performance certification: NOT TESTED
Packaging: CONFIGURED, NOT VERIFIED
Release acceptance: NOT YET MET

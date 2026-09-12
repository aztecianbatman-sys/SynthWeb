# v0.1.0 implementation status

## FUNCTIONAL / IMPLEMENTED
- native Tauri shell
- real URL navigation
- real web page rendering through the platform runtime
- tabs, activation, close, reopen
- tab drag-reordering
- omnibox URL/search classification
- local tab/history suggestions in the omnibox
- back / forward
- real stop / reload
- real print
- real page zoom controls
- bookmarks
- history
- real downloads with collision-safe filenames and persistent download metadata
- private tabs using the runtime's incognito mode
- command palette
- runtime/security status surface
- custom Synth Browser mark
- Cortis-branded real web-search delegation
- SQLite-backed workspaces and workspace switching
- SQLite-backed saved sessions
- SQLite-backed Reading Shelf
- SQLite-backed browser settings
- dark/light/system theme setting
- accent, density, shortcuts, recent-activity, search-history, quiet-mode settings
- real browser-data clearing

## PARTIALLY FUNCTIONAL
- new-window requests are not yet converted into full secondary browser windows
- workspace UI supports create/switch; rename/delete/duplicate/reorder UI remains
- saved sessions restore URLs and tab metadata but intentionally do not claim historical webpage snapshots
- download manager UI is compact; pause/resume/verification UI is not yet exposed
- Cortis suggestions are currently local tab/history suggestions only

## DESIGNED / NOT STARTED
- workspace archive/delete/duplicate/reorder UI beyond current safe primitives
- workspace-specific bookmarks/shelf/notes
- notes
- research board
- context threads
- Page Lens / deterministic reader extraction
- translation provider abstraction
- full tab overview/search virtualization
- extension manager
- extension permission UI
- full site permissions center
- tracker filtering rule engine
- HTTPS-only setting
- diagnostics export bundle
- data export formats
- profile manager / guest mode
- sync interfaces
- Synth Assist provider adapters and secure key storage
- AI search mode
- signed update system
- measured performance suite and 10/50/100/200 tab benchmarks
- packaged-app smoke testing in this environment

## BLOCKED
- bundled Azecotron Web Chromium fork. v0.1 uses the host platform webview runtime and documents the fork as a separate integration milestone. A real fork requires a reproducible Chromium revision, patch series, security update path, sandbox validation, licensing notices, and a verified build pipeline.

## TESTING TRUTH
Repository unit tests cover URL/domain/search classification and the runtime-boundary type.
GitHub Actions is configured for Windows rustfmt, clippy, test, and Tauri build.
No claim is made that a packaged installer has been successfully launched in this environment until a completed CI/package smoke test is available.

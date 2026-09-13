# Synth Browser v0.1.0 status

The implementation follows the master prompt incrementally. Statuses below describe source-level implementation, not unverified marketing claims.

## Source-complete feature set
- Tauri browser shell with tabs, private tabs, pinning, mute metadata, reorder, reopen and tab overview.
- Omnibox URL/search classification with Cortis web/images/news/videos/maps modes and query-history controls.
- Back, Forward, Stop, Reload, Reload without cache, zoom, print, screenshot, PDF export and page HTML save.
- Bookmarks, History, Reading Shelf, workspace-scoped saved content and sessions.
- Session lazy-restore and inactive-tab discard/restore safety paths.
- Notes and Research Board with Markdown/BibTeX citation export.
- Profiles with isolated SQLite roots, isolated webview data directories, Guest Mode, rename/export/import/delete flows.
- Per-origin permissions with Allow/Ask/Block policies and permission history.
- Cookie/site-storage inspection and deletion, category data clearing and privacy diagnostics.
- HTTPS-only navigation, Shielded privacy preset, disabled autofill/search-memory/AI defaults and first-party-isolation policy.
- Native Azecotron ContentMainDelegate, ContentBrowserClient, BrowserMainParts and BrowserContext source.
- Real Chromium WebContents creation/adoption and Windows native-view/HWND embedding source.
- Per-tab navigation/loading/security/renderer observers and native IPC event stream.
- Native DownloadManagerDelegate, PermissionControllerDelegate and DevToolsManagerDelegate source.
- Native Chromium URLLoaderThrottle tracker blocking with measured block events and strict cross-origin cookie stripping source.
- Synth Assist provider/model management, secure API keys, model discovery, AI threads/history, streaming transport, explicit context gates and AI Search workflow.
- Extension install/manifest metadata, enable/disable/remove management UI/backend.
- Command palette, selection actions, Reader Mode, Page Lens and Browser Tools surfaces.
- Signed update manifest verification, SHA-256 update staging, pending update metadata and rollback primitives.
- Diagnostics/performance sampling infrastructure.
- Localization resource foundation and accessibility capability/audit infrastructure.
- Reference Synth UI: left navigation rail, centered Cortis search, live Shield capsule and feature command center.

## Source gates added
- scripts/acceptance/verify-source.ps1
- scripts/acceptance/privacy-regression.ps1
- scripts/acceptance/accessibility-audit.ps1
- scripts/acceptance/release-gate.ps1
- scripts/acceptance/run-source-gates.ps1
- scripts/acceptance/windows-build-and-smoke.ps1
- scripts/acceptance/performance-matrix.ps1
- scripts/acceptance/acceptance-matrix.json
- scripts/verify-azecotron-production-boundary.cmd

## Remaining work: build/setup/runtime verification only
The following are deliberately not claimed as complete until they run on a real Windows environment with the pinned Chromium checkout:
1. Fetch/sync Chromium 152.0.7977.119 with depot_tools and verify the exact revision.
2. Apply the Azecotron patch series and Synth native source installation without conflicts.
3. Run GN generation and compile `//azecotron/app:azecotron_host` plus the required Chromium runtime targets.
4. Run Rust fmt, clippy, unit tests and Tauri packaging on Windows.
5. Run native HWND/WebContents smoke tests and verify renderer/GPU/sandbox processes.
6. Verify navigation, tabs, popups, clean shutdown, restart, renderer crash recovery and multi-window behavior.
7. Verify real network tracker blocking, blocked-request counters, cookie isolation and HTTPS enforcement.
8. Verify native permissions, downloads, DevTools, extensions, media, WebRTC, PiP and fullscreen.
9. Run profile-isolation tests and Guest cleanup tests.
10. Run measured startup, 10/50/100/200-tab, 1-hour and 4-hour stability/performance tests.
11. Run installer, signed update, upgrade, uninstall and rollback tests.
12. Run manual accessibility, high-DPI, screen-reader, contrast and localization tests.
13. Produce the final signed release and acceptance report.

## Verification truth
The code/repository can be inspected and source gates can be run on a suitable machine, but this session's container cannot resolve `github.com`, so it cannot clone the repository or execute the Windows/Chromium build locally. No executable, installer or runtime result is therefore marked VERIFIED from this environment.

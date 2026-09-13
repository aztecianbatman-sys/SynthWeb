# Synth Browser source-completion contract

This document is the source-level completion gate for the current browser feature set.

## Browser shell

Implemented in source:
- tabs, pinned tabs, mute metadata, drag/reorder;
- back, forward, reload, stop, reload-without-cache;
- omnibox URL/search routing;
- Cortis web/image/news/video/maps modes;
- bookmarks, history, Reading Shelf;
- workspaces and saved sessions;
- lazy session restore and inactive-tab discard/restore;
- notes and research boards;
- screenshots, print, PDF export, page HTML save;
- command palette and selection actions;
- multiple browser windows and workspace launch support.

## Privacy

Implemented in source:
- private tabs and per-profile webview data directories;
- Guest Mode profile roots;
- per-origin permissions with Allow/Ask/Block policy;
- permission history;
- cookies and site-data inspection/deletion;
- category-specific data clearing;
- HTTPS-only mode;
- first-party-isolation policy;
- autofill disabled by default;
- Chromium-side tracker URLLoaderThrottle;
- measured native tracker-block events;
- strict cross-origin cookie stripping;
- SHA-256 download verification;
- privacy posture audit and Shielded preset.

## Synth Assist

Implemented in source:
- provider presets;
- secure credentials;
- model discovery;
- streaming transport where supported;
- AI threads/messages/history;
- explicit page/selection context gates;
- prompt-injection isolation instructions;
- AI Search provider workflow;
- AI-disabled default.

## Profiles and extensions

Implemented in source:
- profile registry;
- isolated profile roots;
- Guest Mode;
- profile rename/export/import/delete;
- extension manifest discovery;
- extension install/enable/disable/remove metadata store;
- extension permission metadata.

Native Chromium extension execution remains a runtime verification item, not a fake claim.

## Updates and diagnostics

Implemented in source:
- signed Ed25519 manifest verification;
- HTTPS-only manifest/update transport;
- SHA-256 update verification;
- staged update metadata;
- verified swap preparation;
- rollback backup/staging;
- diagnostics snapshot/export;
- performance sampling storage;
- crash-count/session-state metadata.

## Accessibility and localization

Implemented in source:
- accessibility capability/audit model;
- keyboard-oriented controls in the main UI;
- semantic labels on primary controls;
- reduced-motion support;
- dark/light/system presentation;
- localization resource format and runtime locale module.

The current shipped locale is en-US; additional translations and manual screen-reader/contrast/DPI audits are verification/content work rather than architecture gaps.

## Native Azecotron

Implemented in source:
- Synth ContentMainDelegate;
- Synth ContentBrowserClient;
- Synth BrowserMainParts;
- Synth BrowserContext;
- real WebContents creation;
- native HWND attachment path;
- per-tab navigation/loading/security/renderer observers;
- Chromium URLLoaderThrottle network privacy hook;
- process supervision and event IPC;
- native runtime status and launcher;
- production-boundary guard preventing Content Shell regression.

## Explicitly remaining after source completion

These are not silently marked complete:
- real Windows Chromium 152 checkout/build;
- GN/C++ compilation against the exact pinned revision;
- real renderer/GPU/sandbox smoke testing;
- actual HWND embedding test;
- media/WebRTC/PiP/fullscreen runtime tests;
- native Downloads/Permission/DevTools/Extension service behavior verification;
- tracker/cookie isolation integration tests;
- 10/50/100/200-tab performance tests;
- 1-hour/4-hour stability tests;
- installer/upgrade/uninstall/rollback tests;
- manual accessibility audit;
- release signing and final acceptance report.

The build/verification harness is under scripts/acceptance/.

# v0.1.0 implementation status

FUNCTIONAL:
- native Tauri shell
- real URL navigation
- real page rendering through the platform runtime
- tabs, close, reopen
- omnibox URL/search classification
- back/forward/reload
- bookmarks
- history
- downloads
- private tab runtime mode
- command palette
- runtime status surface
- custom Synth Browser mark
- Cortis branded search delegation

PARTIALLY FUNCTIONAL:
- new-window requests are routed back to the active browsing flow rather than creating a complete multi-window tab manager
- browser history back/forward is delegated to page history
- download manager UI is intentionally compact and backed by real download callbacks

NOT STARTED:
- tab drag reorder
- workspaces
- saved sessions
- reading shelf
- notes/research board
- Privacy Shield tracker rule engine
- full permissions UI
- extension manager
- structured Cortis result backend
- Synth Assist
- signed update system
- data export/reset flows
- true Azecotron Web Chromium fork

BLOCKED:
- bundled Chromium fork integration until a reproducible fork/build/security pipeline is established

CI verification is being run from a pull-request branch before merging to main.

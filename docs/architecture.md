# Architecture

Synth Browser is built with Rust + Tauri for the native application layer.

Layers:
- Tauri shell
- Rust application services
- BrowserRuntime boundary
- search/provider layer
- SQLite persistence
- privacy/security policy
- optional AI provider boundary
- frontend browser chrome

The browser tabs are child webviews attached to the main Tauri window. The active page occupies only the content region beneath browser chrome.

A future Azecotron Web Chromium runtime can replace the concrete webview integration behind the runtime boundary without requiring a UI rewrite.

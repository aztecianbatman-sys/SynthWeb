# Synth Browser architecture

Synth Browser follows the master prompt's separation of concerns:

1. Tauri native shell
2. Rust application services
3. BrowserRuntime abstraction
4. Cortis SearchProvider layer
5. SQLite persistence
6. Privacy/security policy
7. Optional AIProvider layer
8. Frontend browser chrome

## Browser runtime

BrowserRuntime is the stable seam for browsing operations. v0.1 uses Tauri's child-webview/Wry implementation. On Windows, that is WebView2. Azecotron Web is not falsely represented as the current renderer.

Replacing the runtime later must not require rewriting tabs, workspaces, research features, persistence, or browser chrome.

## Service boundaries

src-tauri/src/services.rs defines explicit interfaces for:
- downloads
- history
- bookmarks
- workspaces
- permissions
- settings
- diagnostics
- updates

The real v0.1 implementations currently live in focused functions around SQLite and the Tauri runtime. The marker implementations exist only for a compile-time architectural check; they are not product behavior.

## Persistence

Structured local state is stored in SQLite with schema initialization and indexes. Browser state, settings, query history, notes, research boards, saved sessions, shelf entries, and download metadata are stored separately from ephemeral UI state.

## Security boundary

Web pages are untrusted. They do not receive arbitrary shell or filesystem IPC. Navigation is Rust-validated to HTTP(S), downloads are routed through runtime callbacks, and Synth Assist context is collected only after explicit user action.

## Current limitations

Profiles, extensions, the full permissions center, tracker interception, signed updates, and the true Azecotron Chromium fork remain future work and are recorded as such rather than exposed as fake controls.

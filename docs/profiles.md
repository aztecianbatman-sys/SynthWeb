# Profiles and Guest Mode

Status: IMPLEMENTED IN SOURCE / NATIVE RUNTIME NOT VERIFIED.

A Synth profile is an isolation boundary for:
- cookies
- site storage
- history
- bookmarks
- Reading Shelf
- workspaces
- permissions
- settings
- browser-runtime data
- extensions
- saved sessions

Implemented:
- separate profile registry
- separate profile data directories
- profile-scoped SQLite state
- profile-scoped webview runtime data
- profile rename
- profile creation/deletion
- profile export/import
- profile integrity hashing
- integrity verification
- isolated extension storage
- Guest Mode with a temporary unique profile root
- Guest cleanup on exit
- native Azecotron profile policy serialization

Still pending:
- Windows cross-profile leakage tests
- native Chromium BrowserContext integration verification
- long-session profile stress testing

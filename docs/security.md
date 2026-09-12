# Security

Implemented:
- Rust URL validation
- HTTP(S)-only external webview navigation
- no arbitrary shell IPC
- no native filesystem access granted to web pages
- local SQLite persistence
- private tabs use the concrete runtime's incognito mode
- downloads do not auto-run
- download filenames are made collision-safe

Not yet implemented:
- tracker rule engine
- HTTPS-only switch
- complete permissions center
- extension manager
- signed updater
- verified Azecotron Chromium sandbox

# Testing status

Automated workflows are configured for:
- frontend JavaScript syntax
- Azecotron production-boundary checks
- Rust fmt
- Rust clippy
- Rust unit tests
- Tauri Windows packaging
- pinned Azecotron Chromium build
- native host smoke testing
- build manifest generation

Source-level checks currently performed:
- frontend JavaScript syntax parse
- native source presence
- no Content Shell dependency under azecotron/app
- registered Tauri command audit
- architecture/source consistency checks

Not verified here:
- Windows Rust compilation
- Windows Tauri installer launch
- pinned Chromium 152 compilation
- Azecotron HWND/WebContents integration
- renderer/GPU process startup
- native permission/download behavior
- native DevTools
- native extension runtime
- WebRTC/device selection
- 10/50/100/200-tab workloads
- multi-hour memory/CPU stability
- profile isolation stress tests
- tracker/cookie network tests
- signed binary update transport/rollback
- manual accessibility certification

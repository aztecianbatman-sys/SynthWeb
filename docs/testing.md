# Testing status

Automated Windows workflow:
- cargo fmt --check
- cargo clippy --all-targets --all-features -- -D warnings
- cargo test
- cargo tauri build

Source-level checks performed in the development environment:
- frontend JavaScript syntax parse passed
- required Rust modules and registered commands checked
- required frontend functions and event listeners checked
- required architecture/docs layers checked

Not verified in this environment:
- Rust compilation and Cargo tests
- Windows Tauri packaging and installer launch
- WebView2 smoke test
- 10/50/100/200 tab and multi-hour performance workloads
- profile isolation
- extension compatibility
- complete permission behavior
- true Azecotron Chromium fork build
- individually verified Cortis providers

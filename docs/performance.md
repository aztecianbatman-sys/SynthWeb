# Performance test plan

The master prompt defines performance as an engineering goal that must be measured, not advertised.

Required scenarios:
- startup
- 10 tabs
- 50 tabs
- 100 tabs
- 200 tabs
- repeated workspace switching
- repeated restart
- repeated settings navigation
- repeated Synth Assist open/close
- repeated downloads
- multi-hour sustained workload

Metrics to capture where the platform permits:
- startup time
- app/browser process memory
- tab count
- database size
- cache size
- crash count
- runtime version
- update state

Status: NOT TESTED in this environment because Rust/Cargo and a Windows desktop runtime are unavailable here. No invented CPU/RAM numbers are used.

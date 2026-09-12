# Azecotron Web Chromium runtime

## Exact source pin

- Chromium: 152.0.7977.119
- Git revision: e6333471674f4d3af9f386bfc2e5e4388333b734
- Source: https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.119
- Pin date: 2026-09-08

Chromium is fetched with depot_tools at build time rather than vendored into
SynthWeb.

## Fork

The Azecotron fork patch series currently contains:

1. 0001-azecotron-open-source-branding.patch
   - changes the open-source Chromium product name and short product name to
     Synth Browser.

No Chromium sandbox or security mitigation is intentionally disabled.

## Reproducible bootstrap

From Windows Command Prompt with depot_tools on PATH:

scripts\bootstrap-azecotron.cmd

This performs:
- Chromium checkout
- exact revision checkout
- gclient dependency sync
- patch validation with git apply --check
- patch application

Patch drift is a hard failure.

## Release build

scripts\build-azecotron.cmd

The GN configuration is an unbranded release build:
- is_official_build=true
- is_debug=false
- is_chrome_branded=false
- target_cpu="x64"
- is_component_build=false
- symbol_level=0
- blink_symbol_level=0
- v8_symbol_level=0

Chromium's current Windows guidance recommends depot_tools/fetch/gclient,
GN and Ninja/autoninja and notes that large builds benefit substantially from
fast storage, many CPU cores, and substantial RAM.

## CI

.github/workflows/azecotron.yml defines a manual self-hosted-Windows job that:
- checks the required depot_tools commands;
- prepares the pinned fork;
- builds chrome;
- executes chrome.exe --version;
- executes a headless about:blank DOM smoke test;
- publishes a build manifest.

A self-hosted Windows runner is intentionally required because Chromium's source
and build footprint are much larger than an ordinary desktop app CI workload.

## Integration status

Synth Browser's current desktop shell continues to use WebView2. The Azecotron
Chromium tree is now a real, pinned, patchable runtime source component with
build automation. Replacing the live runtime still requires a native Chromium
Content API embedding implementation and packaged Windows smoke testing.

That integration must not be faked by drawing a Chromium-like surface or by
disabling browser security.

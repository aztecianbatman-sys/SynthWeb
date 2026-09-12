# Azecotron Web — Chromium fork

Azecotron Web is the Chromium-derived browsing runtime for Synth Browser.

This repository does **not** vendor the entire Chromium source tree. Chromium
uses depot_tools/gclient and a large multi-repository dependency graph. The
source checkout is reproduced into a sibling directory named `chromium` by
the bootstrap script, pinned to the revision in `chromium/REVISION`, and then
the fork patch series is applied.

## Current pin

- Chromium: 152.0.7977.119
- Git revision: e6333471674f4d3af9f386bfc2e5e4388333b734
- Base: chromium/src stable tag 152.0.7977.119

The pin is deliberate: Chromium `main` changes continuously; a stable tagged
revision makes the fork/release process auditable.

## Fork rules

1. Never disable Chromium sandboxing to make integration easier.
2. Never add Google-internal branding or assets.
3. Preserve Chromium LICENSE and all third-party notices.
4. Keep the Chromium security/update path explicit.
5. Every fork change must live in `chromium/patches/` and be reproducible.
6. A rebase must first run `git apply --check` against the pinned source.
7. A failed patch is a hard failure, not an instruction to continue with a
   partially modified source tree.

## Runtime goal

The eventual runtime must expose the BrowserRuntime contract used by the
Synth Browser native shell:

- create_view
- navigate
- back
- forward
- reload
- stop
- close_view
- get_url
- get_title
- set_zoom
- execute_script where safely supported
- print
- screenshot/capture
- permissions
- browser events

The current v0.1 application remains usable through its supported host
WebView2 runtime while Azecotron is being built and validated.

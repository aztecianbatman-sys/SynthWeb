# Azecotron Web Chromium runtime

## Exact source pin

- Chromium: 152.0.7977.119
- Git revision: e6333471674f4d3af9f386bfc2e5e4388333b734
- Source tag: 152.0.7977.119
- Pin date: 2026-09-08

Chromium is fetched with depot_tools at build time rather than vendored into
SynthWeb.

## Native runtime

Synth Browser now supplies its own ContentMainDelegate, ContentBrowserClient,
BrowserMainParts, and BrowserContext. The initial browsing page is created
directly with content::WebContents and adopted by AzecotronRuntimeHost.

The former Content Shell BrowserContext and BrowserMainParts dependency has been
removed from the Synth runtime source.

The current native host is intentionally small. Download, permission, DevTools,
and deeper browser services are being added through Synth-owned seams rather
than importing Content Shell services.

## Build

From Windows Command Prompt with depot_tools on PATH:

scripts\bootstrap-azecotron.cmd
scripts\build-azecotron-host.cmd

The host build checks the pinned Chromium revision, installs the Synth-owned
native source stack, generates GN files, and builds the Azecotron host target.

## Verification

The repository contains a manual self-hosted Windows workflow and runtime smoke
test. A real Windows runner is still required before the binary can be marked
verified.

Acceptance requires:
- native host compiles against pinned Chromium;
- Synth window target is accepted;
- real WebContents is created;
- navigation works;
- renderer/GPU processes launch normally;
- native privacy throttles run;
- permissions and downloads work;
- DevTools works;
- clean shutdown/recovery occurs.

No release claim is made before these tests pass.

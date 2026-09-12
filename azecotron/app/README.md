# Azecotron native browser process

The executable in this directory is the native Chromium-side host for Synth
Browser.

Startup flow:

1. Chromium ContentMain initializes the browser/renderer/GPU process model.
2. Chromium's ShellMainDelegate supplies the Content clients and browser
   services.
3. Content Shell creates a real BrowserContext and WebContents.
4. The Synth startup callback takes that real WebContents.
5. On Windows, its native view is reparented to the HWND supplied by Synth.
6. The original Content Shell wrapper window is hidden.
7. The WebContents remains owned by Chromium's browser process and continues
   using Chromium's real multiprocess security model.

Launch switches consumed by this host:
- --synth-parent-hwnd=<decimal HWND>
- --synth-url=<http(s) URL or about:blank>

No --no-sandbox or equivalent security-disabling switch is added by this host.

Current milestone:
- ContentMain bootstrap: implemented in source
- real WebContents creation: implemented through Chromium Content Shell
- native HWND attachment: implemented in source for Windows
- production Synth event bridge: next
- packaged Windows runtime: NOT VERIFIED

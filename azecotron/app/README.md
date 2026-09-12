# Azecotron native browser process

The executable in this directory is the native Chromium-side host for Synth
Browser.

Startup flow:

1. Chromium ContentMain initializes the browser/renderer/GPU process model.
2. SynthContentMainDelegate provides Synth-owned Content clients.
3. SynthBrowserMainParts creates a SynthBrowserContext for the selected profile.
4. Synth creates a real content::WebContents against that BrowserContext.
5. AzecotronRuntimeHost adopts the WebContents and attaches its native view to
   the HWND supplied by Synth on Windows.
6. Chromium's normal multiprocess renderer/GPU/security model remains active.

Launch switches:
- --synth-parent-hwnd=<decimal HWND>
- --synth-tab-id=<Synth tab id>
- --synth-url=<http(s) URL or about:blank>
- --user-data-dir=<profile runtime directory>

No --no-sandbox or equivalent security-disabling switch is added by this host.

Current milestone:
- Synth ContentMain bootstrap: IMPLEMENTED IN SOURCE
- Synth BrowserMainParts: IMPLEMENTED IN SOURCE
- Synth BrowserContext: IMPLEMENTED IN SOURCE
- real WebContents creation: IMPLEMENTED IN SOURCE
- native HWND attachment: IMPLEMENTED IN SOURCE for Windows
- native navigation/loading/security/renderer events: IMPLEMENTED IN SOURCE
- Chromium network throttle integration: IMPLEMENTED IN SOURCE
- Windows packaged runtime: NOT VERIFIED

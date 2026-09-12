# Azecotron fork patch series

Patches in this directory are applied in lexical order to the exact Chromium
revision recorded in ../REVISION.

Rules:
- Every patch must pass git apply --check before it is applied.
- Patch failure stops the build.
- Do not hand-edit the Chromium checkout after applying patches.
- Rebase patches only after updating ../REVISION deliberately.
- Do not remove Chromium security mitigations, sandboxing, origin isolation,
  site isolation, certificate checks, or update-related code for convenience.

Current patch series:
- 0001-azecotron-open-source-branding.patch

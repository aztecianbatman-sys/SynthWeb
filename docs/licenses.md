# Azecotron / Chromium licensing

Azecotron is a downstream build of the open-source Chromium project.

The build checkout is responsible for carrying Chromium's LICENSE and the
complete third-party license/notice set for the exact dependency graph synced
by gclient.

Synth Browser does not use Google Chrome proprietary branding or internal
Google assets. The fork uses Chromium's open-source branding surface and
changes only the product naming needed for the Synth Browser downstream build.

Before distributing a built runtime:
- retain Chromium LICENSE;
- retain all applicable third-party notices;
- retain generated notices required by the selected dependencies;
- include Synth Browser/Azecotron downstream attribution;
- state clearly that the product is an independent downstream build.

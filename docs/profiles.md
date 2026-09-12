# Profiles and Guest Mode

Status: DESIGNED / NOT STARTED.

A profile must be an isolation boundary for cookies, site storage, history, bookmarks, workspaces, permissions, settings, and browser-runtime data.

The implementation must use separate profile data directories and separate persistent application state. Guest Mode must use a temporary profile and must not merge its data into another profile.

Do not ship a decorative profile switcher until those boundaries are real.

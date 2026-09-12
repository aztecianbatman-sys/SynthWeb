#!/usr/bin/env python3
"""Apply Synth Browser's Cortis branding to Chromium's public search-provider data.

This is intentionally strict: it edits the existing Chromium Google provider
without inventing a new endpoint. Cortis v0.1 remains Google-backed at the
provider layer, while the Synth Browser UI supplies the Cortis identity.
"""

from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "third_party" / "azecotron-chromium" / "src" / "components" / "search_engines" / "prepopulated_engines.json"

if not TARGET.exists():
    raise SystemExit(f"ERROR: Chromium source not found: {TARGET}")

text = TARGET.read_text(encoding="utf-8")
data_start = text.find('"elements"')
if data_start < 0:
    raise SystemExit("ERROR: Chromium prepopulated engine schema changed: elements section missing")

# Preserve Chromium comments by editing only the exact Google object fields.
needle = '"google": {'
start = text.find(needle)
if start < 0:
    raise SystemExit("ERROR: Google provider entry not found in Chromium source")

end = text.find('\n    },', start)
if end < 0:
    raise SystemExit("ERROR: Could not locate Google provider entry end")

block = text[start:end]
if '"name": "Google"' not in block or '"keyword": "google.com"' not in block:
    raise SystemExit("ERROR: Google provider entry shape changed; refusing to patch")

updated = block.replace('"name": "Google"', '"name": "Cortis"', 1)
updated = updated.replace('"keyword": "google.com"', '"keyword": "cortis"', 1)

if updated == block:
    raise SystemExit("ERROR: Cortis transformation made no change")

TARGET.write_text(text[:start] + updated + text[end:], encoding="utf-8")

# Strict postcondition: the generated data must still parse after comments are
# removed only by Chromium's own JSON-with-comments parser. We therefore validate
# the modified field region structurally rather than pretending Python can parse it.
post = TARGET.read_text(encoding="utf-8")
if '"name": "Cortis"' not in post or '"keyword": "cortis"' not in post:
    raise SystemExit("ERROR: Cortis postcondition failed")

print(f"Updated Cortis provider data: {TARGET}")

# Cortis

Cortis is the branded search layer of Synth Browser.

v0.1.0 behavior:
- full URLs navigate directly
- domain-like input receives HTTPS
- free-text queries are encoded and delegated to a real Google web-search URL
- local bookmarks/history are not submitted as query context
- no fake result cards are generated

This is an honest provider delegation layer, not a claim that Synth Browser ships a private Google index or copied Google source code.

The provider interface is intentionally small so a licensed/index-backed Cortis result service can replace the delegation later.

# Synth Assist

Synth Assist is optional and disabled by default.

## Context boundary

Page contents are not collected automatically. The user must explicitly request page context or selected-text context. The browser extracts only the requested content and passes it to the configured AI provider.

## Provider

v0.1 implements an OpenAI-compatible HTTP adapter. Local loopback HTTP endpoints are supported; hosted endpoints require HTTPS.

Provider-specific validation for Ollama, LM Studio, and individual hosted providers remains required before those are marketed as individually verified integrations.

## Credentials

API keys are stored through the operating system credential/keyring service. They are not written to SQLite, the frontend bundle, diagnostics, or logs.

## Failure handling

HTTP, authentication, model, context-size, and malformed-response failures are surfaced as real errors. The browser continues to work with Synth Assist disabled.

## Webpage safety

Webpage text is untrusted data. Synth Assist receives explicit user context and is instructed not to treat webpage text as a browser command.

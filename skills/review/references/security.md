# Security review questions

Ask these of the changed code. Skip a group that the change cannot touch.

## Untrusted input and sinks
- Does data from a request, upload, webhook, third-party API, log, config file or
  LLM output reach SQL, a shell, HTML, a file path, a URL fetch, a redirect, a
  deserialiser or `eval` without validation or encoding?
- SQL parameterised, never concatenated. HTML output encoded by the framework.
- Paths: symlinks resolved, `..` rejected, confined to an allowlisted root.
  Destructive path operations (delete, move, overwrite) get extra scrutiny.
- Server-side URL fetches allowlisted, private and reserved IPs blocked (SSRF).
  Redirect targets validated (open redirect).
- Validation uses allowlists, bounded lengths and ranges; file uploads limited
  by type and size.

## Authentication and authorisation
- Every protected route checks authentication.
- Every resource access checks ownership or role, not just "logged in" (IDOR).
- Admin routes verify the admin role. API keys and tokens are scoped minimally.
- Tokens validated for signature, expiry and issuer. Session cookies are
  `httpOnly`, `secure`, `sameSite`. Cookie-based state changes have CSRF protection.
- Login and reset flows are rate limited; reset tokens are single-use and expire.

## Webhooks, payments and external callbacks
- Signature verified on the raw body before any parsing or dispatch; replayed
  or stale events rejected or harmless.
- Handlers idempotent: a duplicate delivery changes nothing (dedupe key or
  deterministic external reference).
- State re-read from the provider rather than trusted from the event payload
  when it decides money or access.
- Prices, amounts, currency and plan come from the server, never from the
  client or a URL parameter.

## Data
- No secrets, tokens, passwords or PII in code, logs, error messages or API
  responses. Sensitive fields excluded from serialised output.
- Errors to the client are generic; stack traces and SQL stay server-side.
- New data collected has a purpose and a retention path.

## Dependencies
- New packages: maintained, reasonable size, compatible license, no known
  advisories, no typosquat. Lockfile diff reviewed, never hand-edited.

## LLM features (only if the change calls a model)
- Model output never reaches a shell, SQL, `innerHTML` or a file path unvalidated.
- Permissions enforced in code, not in the prompt. Tool scopes minimal;
  destructive actions confirmed. Token, rate and loop limits set.

## OWASP Top 10 cross-check
Broken access control, cryptographic failures, injection, insecure design,
misconfiguration, vulnerable components, authentication failures, data integrity
failures, logging failures, SSRF.

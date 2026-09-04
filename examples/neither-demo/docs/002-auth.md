# ADR 002 — Session-cookie authentication

Status: superseded by [ADR 005](005-auth-superseded.md).

## Decision
Use server-side session cookies (HttpOnly, Secure, SameSite=Lax) for dashboard login.

## Rejected
JWT in localStorage — rejected: XSS on the marketing site could steal a long-lived bearer token.

## Constraint
The first release is a single origin (`app.example.com`) with no native client.

## Citation
Security review 2026-04-02: cookie + HttpOnly + SameSite=Lax is enough while we remain same-site only. Do not put access tokens in JavaScript-readable storage.

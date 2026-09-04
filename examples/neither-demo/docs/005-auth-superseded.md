# ADR 005 — JWT access tokens (supersedes ADR 002)

Status: accepted. Supersedes [ADR 002](002-auth.md).

## Decision
Replace session-cookie auth (ADR 002) with short-lived JWT access tokens and rotating refresh tokens stored in HttpOnly cookies. Access tokens expire in 15 minutes.

## Rejected
Keeping ADR 002 session cookies — rejected: a native app cannot share the web cookie jar, and cookie CSRF blocked partner SSO. Long-lived JWT in localStorage remains rejected (ADR 002 XSS concern still stands).

## Constraint
Refresh-token rotation is stored in Postgres. Access tokens must not be readable by JavaScript. Partner SSO needs a bearer token the mobile client can attach.

## Citation
Auth design review 2026-06-12: ADR 002 is superseded. Session cookies may remain for one release as a compatibility shim, then JWT + rotating refresh only.

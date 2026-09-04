# ADR 004 — Reject Kafka for billing events

## Decision
Deliver billing and webhook retries with a Postgres jobs table (`SELECT … FOR UPDATE SKIP LOCKED`) and `LISTEN/NOTIFY`. Events commit in the same transaction as invoice rows (ADR 001, ADR 003).

## Rejected
Kafka — rejected: no platform team to run a broker, dual-write would break the no-duplicate-charges constraint, and volume is hundreds of events per day, not millions.

## Constraint
Billing events must share a transaction with invoice line items. A broker is a second system of record we will not operate.

## Citation
Ops 2026-05-01: we are not standing up KRaft for invoice emails. Replay is the jobs table plus Stripe idempotency keys, not a log.

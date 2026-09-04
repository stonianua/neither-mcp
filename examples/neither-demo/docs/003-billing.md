# ADR 003 — Billing provider

## Decision
Use Stripe Checkout and Stripe-signed webhooks as the only payment rail. Persist invoices and tax rows in Postgres (ADR 001).

## Rejected
In-house card vault and Braintree — rejected: PCI SAQ-D is out of scope for this team; we will not touch raw PAN.

## Constraint
No card number may touch our servers. Duplicate webhook deliveries must not double-charge (same restart constraint as ADR 001).

## Citation
Finance 2026-04-18: chargeback mail already assumes Stripe dispute IDs. Idempotency keys are `invoice_id` written in the same Postgres transaction as the invoice row.

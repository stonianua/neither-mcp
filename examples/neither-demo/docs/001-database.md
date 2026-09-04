# ADR 001 — Primary database

## Decision
Use PostgreSQL as the system of record for billing and account state.

## Rejected
MongoDB — rejected because we need ACID transactions across invoice line items and tax rows; eventual consistency was unacceptable for chargebacks.

## Constraint
Billing must survive worker restarts without duplicate charges.

## Citation
Spike notes 2026-03: chargeback replay failed twice on document store prototype.

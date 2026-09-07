# Neither API contract (MCP client view)

This document describes what `@neitherai/mcp-server` expects from `api.neither.online`, how each memory tool maps to HTTP endpoints, and where enrichment must populate Decision/Rejected fields. **This repo does not parse markdown or extract Decision/Rejected client-side** — it forwards API fields and formats prose for agents.

## Tool → endpoint mapping

| MCP tool | HTTP | Client transform |
| --- | --- | --- |
| `memory_push` | `POST /api/memory/push` | Pass-through body; formats acceptance guidance only |
| `memory_search` | `GET /api/context/search?q=&limit=` | Pass-through `results[]`; adds agent prose via `formatMemoryDecisionProse` |
| `memory_snippet_fetch` | `GET /api/memory/snippet/{source_id}?node_id=` | Pass-through `content` and metadata |
| `memory_for_file` | `GET /api/memory/context-for?file_path=` | Pass-through `results[]`; same prose formatter as search |
| `memory_timeline` | `GET /api/memory/timeline?…` | Pass-through `events[]` |

Auth: `Authorization: Bearer sk_ctx_*` on every request (`NEITHER_API_KEY`).

## Push → ingest → enrichment lifecycle

1. **`memory_push`** sends markdown (or plain text) as `content` unchanged.
2. API responds with `snippet_id`, `source_id`, `job_id`, `enrichment: "pending"|"ready"`, optional `status_url`.
3. An **async ingest/enrichment job** (API backend — not this repo) should:
   - Persist raw document text (available immediately via snippet fetch as `document_text` / pending enrichment).
   - Parse structured sections (`Decision:`, `Rejected:`, `Constraint:`) into **`project_context` node fields**.
   - Mark enrichment `ready` when nodes are searchable.
4. **`memory_search`** and **`memory_for_file`** read enriched node fields (`decision`, `rejected`, `constraint`, `excerpt`).
5. **`memory_snippet_fetch`** with `node_id` should return **node-aligned excerpt** (`content_scope: "node_excerpt"`, `aligned_to: "node"`) containing the Decision/Rejected text for that search hit.

Agents should poll `status_url` or retry search after ingest completes (`memory_push` guidance).

## Search hit contract (`GET /api/context/search`)

Each element of `results[]` should expose:

| Field | Semantics |
| --- | --- |
| `id` | Node id — pass as `node_id` to `memory_snippet_fetch` |
| `title` | Short label for the decision node |
| `decision` | **Verbatim Decision section body** (not the title) |
| `rejected` | Verbatim Rejected section body, or `null` if none |
| `constraint` | Verbatim Constraint section body, or `null` |
| `excerpt` | Citation quote (≥ ~20 chars when present) |
| `provenance.source_document_id` | Snippet `source_id` for fetch |
| `score` | Retrieval score |

### MCP formatting (display only)

`formatMemoryDecisionProse` renders:

```
Decision: {decision ?? title if decision absent}
Rejected: {rejected}
Constraint: {constraint}
Citation: {excerpt}
```

If the API sets `decision` to the title string (enrichment gap), agents see **Decision prose that mirrors the title** and no Rejected line — exactly the reported repro.

## Snippet fetch contract (`GET /api/memory/snippet/{source_id}`)

| Field | Semantics |
| --- | --- |
| `content` | Verbatim text for the node (when `node_id` set) or document |
| `content_scope` | `"node_excerpt"` when aligned to a search hit node |
| `aligned_to` | `"node"` when `node_id` matched a `project_context` row |
| `enrichment` | `"ready"` when structured fields are populated |
| `node_id`, `title` | Echo of aligned node |

When enrichment is incomplete, clients observe **`content` ≈ short summary** (~200 chars) without Decision/Rejected keywords even though the pushed markdown contained explicit `Decision:` / `Rejected:` sections.

## Known enrichment gap (2026-09-07 repro)

**Symptom** after `memory_push` of markdown with explicit Decision (invite codes) and Rejected (Stripe checkout), post-ingest:

| Surface | Observed | Expected |
| --- | --- | --- |
| `/api/context/search` → `decision` | Same as `title` | Invite-codes decision body |
| `/api/context/search` → `rejected` | `null` | Stripe checkout rejection body |
| `/api/memory/snippet` → `content` | ~193 char summary | Node excerpt including Decision/Rejected |

**Root cause location (API — fix required there):**

- **Service area:** memory **ingest enrichment pipeline** on `api.neither.online` — the async job started by `POST /api/memory/push` that writes **`project_context`** rows and populates `decision` / `rejected` / `constraint` / excerpt fields consumed by:
  - `GET /api/context/search` (search index / node projection)
  - `GET /api/memory/snippet/{source_id}?node_id=` (node excerpt selection)
  - `GET /api/memory/context-for` (file-scoped node list)

**Not fixable in `neither-mcp`:** this client intentionally does not re-parse pushed markdown or infer Decision/Rejected when the API omits them.

**Downstream repo for the fix:** Neither API / ingest worker (not published in this mirror). This repo documents the contract and regression-tests pass-through when the API returns correct fields.

## Contract tests in this repo

Fixtures under `packages/mcp-server/test/fixtures/`:

- `search-hit-enriched.json` — API returns full Decision/Rejected → MCP prose and raw results preserve them.
- `search-hit-unenriched.json` — documents the gap (decision ≈ title, rejected null).
- `snippet-enriched.json` / `snippet-unenriched.json` — snippet pass-through expectations.

Run: `pnpm --filter @neitherai/mcp-server test` (Vitest, no live API key).

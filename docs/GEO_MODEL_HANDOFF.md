# Frontend Handoff: New `#geo` Model (ID-first)

## Scope

This handoff describes the frontend integration target for the new geo annotation model:

- Geo identity is `place_key` (`geonames` preferred, `internal` fallback)
- Annotation is tied to `book_id` (`dhlabid`) and positions
- Frontend accesses everything through backend API

## Data Layers (Backend Internal)

- `annotation_geo.annotation_only.db` (prod annotation core)
  - `geo_postings_v2`, `geo_book_index_v2`, `geo_postings_all`
- `annotation_geo.lean_sidecar_with_key.db` (per-position display helper)
  - `book_id`, `seq_start`, `token_len`, `place_key_type`, `place_key`, `alt_count`
- Fulltext shard+sidecar for text windows/snippets

Frontend should treat these as backend internals and use API only.

## Query Modes Needed

### 1) `#geo`

Meaning: all geo-tagged sequences in current corpus/filter.

Expected behavior:
- Return positional geo hits (`bookId`, `seqStart`, `tokenLen`, `placeKeyType`, `placeKey`)
- Can be grouped by place key in UI
- Optional concordance rendering in same call via `renderHits: true`

### 2) `#geo:<place-key>`

Meaning: all occurrences for one place identity.

Expected behavior:
- No token normalization in frontend
- Frontend provides stable identity directly

### 3) `#geo + word groups`

Meaning: geo-anchored near search.

Example semantics:
- `#geo:3143244 krig`
- `#geo [w1..wN]` via `termGroups`

This is first-class; not a fallback.

## Payload Contract (Frontend -> API)

Unified request shape (proposed v2):

```json
{
  "geo": {
    "enabled": true,
    "placeKeyType": "geonames",
    "placeKey": "3143244"
  },
  "termGroups": [["krig"], ["sjø"]],
  "window": 8,
  "before": 8,
  "after": 8,
  "useFilter": true,
  "filterIds": [100617608, 100617609],
  "totalLimit": 500,
  "parallelShards": true
}
```

Notes:
- For plain `#geo`, `placeKeyType/placeKey` are omitted.
- For `#geo:<id>`, they are required.
- `termGroups` optional for pure geo listing, required for geo+near behavior.
- `renderHits` can be used for early integration tests to get `rendered[]` fragments directly from backend for geo rows.

## First Integration Test (Implemented on Backend)

Backend accepts `renderHits` on `/or_query` namespace calls.

Example: `#geo` within small corpus + fragments:

```json
{
  "terms": ["#geo"],
  "useFilter": true,
  "filterIds": [100617608, 100617609, 100617610],
  "totalLimit": 50,
  "before": 6,
  "after": 6,
  "renderHits": true
}
```

Response includes:
- `rows[]` (geo rows; includes `bookId`, `seqStart`, and `pos` alias)
- `rendered[]` (concordance-like fragments from fulltext sidecar)
- `render_unresolved[]` when some `bookId,pos` could not be rendered

## Response Contract (API -> Frontend)

Core row fields to rely on:
- `bookId`
- `seqStart`
- `tokenLen`
- `placeKeyType`
- `placeKey`
- Optional display fields (when available): `surfaceText`, `fragRaw`, `fragHtml`

Optional diagnostics:
- `_perf` (when profiling enabled)

## UI Rules

- Group map/list by `(placeKeyType, placeKey)`, not by surface string
- Show surface strings as display detail only
- If `alt_count > 1`, show "multiple candidates at this position" indicator

## Backend/API Migration Notes

- Current `/or_query` namespace behavior exists; v2 should add explicit ID-based params
- String token to geonames mapping stays outside fulltext layer
- Fulltext remains for text windows; geo identity remains in annotation layer

## Frontend Checklist

- [ ] Implement state model with explicit `geo` block (`placeKeyType/placeKey`)
- [ ] Add three query entry modes (`#geo`, `#geo:<id>`, `#geo + termGroups`)
- [ ] Keep token-string wrapper outside core query state
- [ ] Render grouped by place ID and show surface as secondary metadata
- [ ] Keep all requests through backend API (no direct SQLite access)

## Acceptance Criteria

- `#geo` returns corpus geo hits and renders grouped by place key
- `#geo:<id>` returns only that place ID
- `#geo + termGroups` executes as near-style geo+word query
- No frontend dependency on shard internals or local db files

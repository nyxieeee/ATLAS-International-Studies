# API Specification — ATLAS Internal Backend

**Style:** JSON over HTTPS, Next.js route handlers. **Auth:** Supabase authenticated session except deliberately public endpoints. **Version:** proposed `/api` v1; add `/api/v1` when external client support is required.

## 1. Global contracts

### Standard success
```json
{"data": {}, "meta": {"requestId": "uuid"}}
```

### Standard error
```json
{"error": {"code": "VALIDATION_ERROR", "message": "Query must contain 2–250 characters.", "details": {}}, "meta": {"requestId": "uuid"}}
```

Possible statuses: `400` malformed request; `401` no session; `403` forbidden; `404` not found/hidden ownership; `409` conflict; `422` schema issue; `429` rate-limited; `502` provider failure; `503` dependency unavailable. Never return stack traces or internal API tokens.

Pagination for research search uses a safe server-generated cursor or bounded page token; response exposes `nextCursor`, not provider secrets. For project listing, use stable cursor or offset with limits. Max page size: 50 initial proposal.

## 2. Endpoint matrix

| Method | Route | Auth | Action |
|---|---|---|---|
| GET | `/api/research/search` | Student | Query OpenAlex and persist normalized results via backend |
| GET | `/api/sources/{sourceId}` | Student | Fetch source metadata, latest status and provenance |
| POST | `/api/sources/{sourceId}/verify` | Student + throttling | Request/refresh DOI metadata check |
| GET | `/api/projects` | Student | List owned projects |
| POST | `/api/projects` | Student | Create project |
| GET | `/api/projects/{projectId}` | Owner | Read project and saved source count |
| PATCH | `/api/projects/{projectId}` | Owner | Edit title/question/status |
| DELETE | `/api/projects/{projectId}` | Owner | Delete project and its saved notes |
| GET | `/api/projects/{projectId}/sources` | Owner | List saved sources, with notes/count |
| POST | `/api/projects/{projectId}/sources` | Owner | Add canonical source by UUID |
| PATCH | `/api/projects/{projectId}/sources/{sourceId}` | Owner | Change reading status and tags |
| DELETE | `/api/projects/{projectId}/sources/{sourceId}` | Owner | Remove saved association and dependent notes |
| POST | `/api/projects/{projectId}/sources/{sourceId}/notes` | Owner | Add note |
| PATCH | `/api/notes/{noteId}` | Owner | Update note |
| DELETE | `/api/notes/{noteId}` | Owner | Remove note |
| POST | `/api/projects/{projectId}/bibliography` | Owner | Export APA 7 references |

For routes containing `{sourceId}` under a project, use the canonical `sources.id` UUID, not the join-row UUID, and look up `project_sources` by `(project_id, source_id)`. Define a maximum note body length (e.g. 10,000 characters) and cap tag counts/length.

## 3. Worked request/response examples

### Search
`GET /api/research/search?q=ASEAN%20maritime%20security&fromYear=2019&toYear=2026&openAccess=true&limit=20`

```json
{
  "data": [{
    "id": "c4df5efa-8ae9-4799-94b3-b9697c220185",
    "title": "Sample title returned by provider",
    "authors": [{"given": "A.", "family": "Scholar", "sequence": 1}],
    "publicationDate": "2024-06-01",
    "doi": "10.1234/example-doi",
    "sourceType": "journal-article",
    "provider": "openalex",
    "providerUrl": "https://openalex.org/works/EXAMPLE",
    "verification": {"status": "unknown", "reason": "Not checked", "checkedAt": null}
  }],
  "meta": {"nextCursor": null, "requestId": "uuid", "partial": false}
}
```

**Examples are synthetic and not actual academic citations.** Normalize `openAccess` using provider-defined fields; do not guarantee full text is freely usable.

### Create project
`POST /api/projects`
```json
{"title": "ASEAN maritime policy", "researchQuestion": "How does ASEAN facilitate maritime cooperation?"}
```
Response: `201 Created` with owned project object. The server derives `user_id` from session, never from the body.

### Save source
`POST /api/projects/{projectId}/sources`
```json
{"sourceId": "c4df5efa-8ae9-4799-94b3-b9697c220185"}
```
Response: `201` for new association or `200` for pre-existing association, with canonical join record; idempotent behavior.

### Verify source
`POST /api/sources/{sourceId}/verify`
```json
{}
```
Response:
```json
{
  "data": {
    "sourceId": "c4df5efa-8ae9-4799-94b3-b9697c220185",
    "status": "partially_verified",
    "reason": "DOI matches, but title comparison requires review",
    "checkedAt": "2026-11-11T00:00:00Z",
    "evidence": {"provider": "crossref", "doiMatch": true, "titleMatch": false},
    "caveat": "Bibliographic verification does not validate article claims."
  }
}
```

### Edit note
`PATCH /api/notes/{noteId}`
```json
{"noteBody": "This article provides a useful framework, but the case evidence is dated."}
```

### Bibliography
`POST /api/projects/{projectId}/bibliography`
```json
{"style": "apa-7", "format": "text", "sourceIds": ["c4df5efa-8ae9-4799-94b3-b9697c220185"]}
```
Response:
```json
{
  "data": {
    "style": "apa-7",
    "format": "text",
    "content": "Example formatted reference; synthetic metadata only.",
    "warnings": [{"sourceId": "c4df5efa-8ae9-4799-94b3-b9697c220185", "field": "venue", "message": "Publication venue missing"}]
  }
}
```

## 4. Backend invariants

- All `{projectId}` and notes routes check ownership with the authenticated user ID and rely on DB RLS as defense-in-depth.
- Student cannot request arbitrary external URLs for server fetching; only validated identifiers go to known provider domains.
- Global source ingestion is server-owned; do not permit student `POST /api/sources` with freely forged bibliographic data.
- Verification may be queued or cached to protect provider quotas; if queued, return `202` and an explicit state.
- Sources returned from providers may lack DOI, author, abstract or publication dates; represent missing data as null or empty with warnings.
- Source ID values are UUID; request and response IDs are independent.
- Add request-level rate limits by user and IP for search, verification and export.

---
## 5. Platform endpoint additions (five pillars)
All routes below use the existing `{data, meta}` success / `{error}` failure envelope, require authentication except explicitly designated public preview endpoints, paginate collections, and validate data with Zod. `403` = entitlement failure, `404` masks resources not owned, `409` = version/content conflict, `429` = quota exceeded.

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/api/countries` | ISO/name searchable countries | authenticated |
| GET | `/api/countries/{iso2}` | Fact sheet plus source metadata | authenticated |
| GET | `/api/countries/compare?ids=PH,JP` | Compare up to two countries and dated indicators | authenticated |
| GET | `/api/countries/{iso2}/relationships` | Sourced directed relationships | authenticated |
| GET | `/api/treaties?country=PH` | Treaty search and participation statuses | authenticated |
| GET | `/api/affairs/topics` | Published topic feed; `asOf` field | authenticated |
| GET | `/api/affairs/topics/{slug}` | Explainer, timeline and source ledger | authenticated |
| POST | `/api/policy-briefs` | Create brief under owned project | owner; limit checked |
| GET/PATCH/DELETE | `/api/policy-briefs/{id}` | Read/write/delete personal brief | owner |
| POST | `/api/policy-briefs/{id}/sources` | Attach source from same owned project | owner |
| POST | `/api/policy-briefs/{id}/export` | Export PDF and citations with warnings | owner; entitlement |
| GET | `/api/simulations/scenarios` | List published scenarios | authenticated |
| POST | `/api/simulations/sessions` | Start scenario with selected country role | owner; limit checked |
| GET | `/api/simulations/sessions/{id}` | Read transcript and rubric | owner |
| POST | `/api/simulations/sessions/{id}/turns` | Append bounded-length response | owner; quota |
| POST | `/api/simulations/sessions/{id}/debrief` | Compute/persist rubric feedback | owner |
| GET | `/api/learning/modules` | Published curriculum index | authenticated |
| GET | `/api/learning/modules/{id}` | Lesson and quiz questions *without answer key* | authenticated |
| POST | `/api/learning/questions/{id}/attempts` | Grade answer and record attempt | owner |
| GET | `/api/learning/progress` | User progress by module | owner |
| GET | `/api/me/entitlements` | Effective tier and usage counters | owner |

### Sample contracts
```json
// GET /api/countries/PH
{
  "data": {
    "iso2": "PH", "name": "Philippines",
    "indicators": [
      {"code": "NY.GDP.MKTP.CD", "value": null, "observationYear": null,
       "provider": "World Bank", "sourceUrl": "https://data.worldbank.org/", "status": "not_loaded"}
    ],
    "relationships": [], "treaties": [], "lastReviewedAt": null
  }, "meta": {"isSample": true}
}
```
This is a **schema example**; a null value must never be shown as verified real data.
```json
// POST /api/policy-briefs
{"projectId":"<uuid>","title":"ASEAN crisis response","researchQuestion":"How can ASEAN respond?"}
// 201 response
{"data":{"id":"<uuid>","status":"draft","sections":{"background":"","stakeholders":"","options":[],"recommendation":""}}}
```
```json
// POST /api/simulations/sessions
{"scenarioId":"<uuid>","selectedRole":"Philippines"}
// 201 response
{"data":{"id":"<uuid>","mode":"scripted","status":"active","turns":[],"disclaimer":"Fictional educational simulation"}}
```
```json
// POST /api/learning/questions/{id}/attempts
{"answer":{"selectedIndex":2}}
// 200 response
{"data":{"correct":false,"explanation":"See the source-linked lesson","referenceUrls":[]}}
```
### Operational rules
- All public data responses include `sourceUrl`, observed/reviewed timestamp, and `verificationStatus` for claims where appropriate; no invented credibility percentages.
- Exports generate a temporary authorized download, not publicly guessable file URLs.
- Read-only MAP/AFFAIRS endpoints never mutate state as a side effect. Per-user quota is enforced transactionally server-side.
- `POST /api/learning/.../attempts` grades server-side; answer keys are not returned in module fetch responses.
- Editorial/admin write routes, if added, require a separate explicit role authorization and audit logs.

# Test Strategy and Acceptance Plan

**ATLAS MVP | QA specification | v1.0**

## 1. Test pyramid

- **Unit:** query validation, DOI normalization, source parsing/deduplication, verification status logic, CSL mapping and citation formatting.
- **Integration:** provider adapters with recorded fixtures, Supabase migrations + RLS policies, route handler authorization, project CRUD.
- **E2E:** sign in → create project → search → open source → verify → save → note → export.
- **Security:** cross-user access matrix, malformed IDs, HTML injection, arbitrary URL/SSRF, rate-limit bypass, secret scanning.
- **User acceptance:** real International Studies coursework scenarios with usability measures.

## 2. Functional test cases

| ID | Scenario | Expected |
|---|---|---|
| T-001 | Student creates project | Project appears only in their list |
| T-002 | Search `ASEAN maritime security` | Source results from provider with provenance |
| T-003 | Empty query | 400 with helpful validation error |
| T-004 | Provider returns no results | Empty state, no fictitious papers |
| T-005 | Provider returns no DOI | Source still shown, verification unknown |
| T-006 | Crossref confirms DOI and matching title | Status `verified` with reason/time |
| T-007 | Crossref unavailable | `unknown`, not false/flagged |
| T-008 | Student saves same source twice | One row, idempotent response |
| T-009 | Student adds/edit/deletes note | Only their project note changes |
| T-010 | Source lacks author/date | Export warns about missing fields |
| T-011 | Student exports 3 saved sources | Valid APA 7 output, sorted per applicable style rules |
| T-012 | Project deleted | Project, associations and notes gone; shared sources persist |
| T-013 | Search rate exceeded | 429 with safe retry guidance |
| T-014 | External metadata includes script tags | Rendered safely, no code execution |

## 3. RLS two-user negative test matrix

Prepare accounts A and B. A creates Project A, saves Source X, creates Note A. B creates Project B and saves the same Source X.

| Operation B attempts | Expected |
|---|---|
| Read Project A by known UUID | Denied / no records |
| Update or delete Project A | Denied |
| Insert project_sources with Project A ID | Denied |
| Read Note A by known UUID | Denied |
| Update or delete Note A | Denied |
| Read shared Source X metadata | Allowed |
| Read A's project-specific tags / reading state | Denied |
| Request bibliography for Project A | Denied |
| Insert into `sources` or `source_verifications` as student | Denied |

Also test anonymous sessions, invalid UUIDs, expired sessions and direct database access through the Supabase anon/publishable key.

## 4. Citation fixture corpus

Include verified expected APA 7 outputs for journal article with DOI, books, reports with organization author, missing author, missing date, multiple authors, same-year publications, and works with incomplete publisher/venue fields. Pin CSL processor and style versions; snapshot test structured CSL inputs and formatted outputs. Human review is required before shipping.

## 5. Performance and reliability

- Test search with 1, 10 and 50 concurrent users in a staging environment within provider terms.
- Measure P50/P95 and error rate for local project actions and upstream search separately.
- Inject OpenAlex timeout, Crossref 429, malformed records and Supabase disconnect.
- Confirm rate limiting, bounded retry and friendly error UI.
- Run backup restoration in staging.

## 6. Accessibility and UX

Keyboard-only navigation for project creation, query filters and source save; visible focus; form labels; meaningful empty/loading/error states; contrast checks; screen-reader semantics; responsive screens at mobile and desktop widths. Test with real students rather than assuming the flow is intuitive.

## 7. Beta evaluation study

Recruit 15–20 International Studies students from multiple year levels where practical. Ask each to: (1) find three usable sources for a real course question, (2) justify why one source is credible or limited, (3) save/annotate, (4) export a bibliography. Record time, task completion, provenance-check correctness, observed friction and repeat-use intention. Compare with their current research workflow.

## 8. Exit criteria

No critical or high-severity access-control issues; P0 flow successful with real source metadata; no invented evidence statuses; APA 7 fixtures pass; launch metrics measured and reviewed; privacy notice and operational runbook approved.

---
## Expanded platform acceptance matrix
| ID | Scenario | Expected result |
|---|---|---|
| MAP-AT-01 | Open PH profile with unavailable GDP year | indicator reads `Unknown` and shows provider/source link; no fabricated value |
| MAP-AT-02 | Compare PH and JP | dated, same-unit metric comparisons; differences in reporting year plainly shown |
| MAP-AT-03 | Open contested boundary | neutral disclaimer; no implied adjudication |
| AFF-AT-01 | Open published event timeline | events ordered by actual date with links to supporting documents |
| AFF-AT-02 | Read content whose review date is past threshold | visible freshness warning |
| AFF-AT-03 | Attempt to view draft explainer as student | 404 / no disclosure |
| POL-AT-01 | Attach another user's source association to brief | rejected (404 or 403) |
| POL-AT-02 | Export brief with missing citations | citation-warning report; no invented DOI/reference |
| POL-AT-03 | Export own brief | successful authorization-checked private PDF link |
| SIM-AT-01 | Student starts scripted scenario with valid country role | owner session created; fictional simulation disclaimer visible |
| SIM-AT-02 | Student requests another student's transcript | blocked by RLS and API owner check |
| SIM-AT-03 | Student ends scenario | rubric feedback references actual choices and scenario rules |
| LRN-AT-01 | Fetch quiz questions | answer keys not present in network payload |
| LRN-AT-02 | Submit an answer | server-calculated result, explanation and personal progress stored |
| LRN-AT-03 | Change answer with crafted client score | server ignores client score |
| PLAN-AT-01 | Free tier reaches limit | clear upgrade/limit notice and no quota bypass |
| SEC-AT-01 | Non-editor publishes topic | blocked and audit event recorded |

### Integration and content QA
- Verify source attribution and license metadata for sample entries from OpenAlex/Crossref, World Bank and official institutional sources.
- Use 10 sample countries and 5 affairs topics to test date/source completeness; test unknown/contradictory/superseded information deliberately.
- Use a set of at least 3 scripted diplomacy scenarios and 20 curated quiz questions for acceptance; review scores for transparent rubric application, not political 'correctness'.
- Accessibility: keyboard-only traversals for map list alternatives, reduced motion, focus management, color contrast and readable mobile tables.
- Regression test navigation and owner isolation across all five pillars before each release.

### Cross-pillar E2E critical path
Navigate AFFAIRS → inspect evidence → open MAP country → save source into research project → complete a POLICY brief → export PDF → launch SIM scenario → finish related LEARN quiz. Ensure citation data remains intact and private records remain owned by the logged-in account.

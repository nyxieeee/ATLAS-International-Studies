# Product Requirements Document (PRD)

**Project:** ATLAS MVP 1.0  
**Owner:** NEXT Technology  
**Status:** Proposed | **Version:** 1.0 | **Updated:** 2026-11-11

## 1. Problem and opportunity

International Studies students often piece together materials from academic indexes, publisher websites, international organizations, library resources and government portals. They must identify actual publications, judge the adequacy of bibliographic evidence, organize sources, and format references. The MVP focuses on making this process efficient **without overstating source credibility**.

### Primary jobs to be done
- *When starting a research question*, locate scholarly materials and verify their bibliographic identity.
- *When comparing candidate materials*, see source type, authorship, venue, publication date, source links, and whether verification was possible.
- *When writing an assignment*, save sources to a project, annotate them, and generate an APA 7 bibliography.

## 2. Users and roles

| Role | Needs | Access |
|---|---|---|
| Guest | Understand ATLAS value | Public marketing pages only |
| Student (P0) | Search, save, annotate, export | Own projects and notes; read public source metadata |
| Platform operator (internal) | Monitor provider errors, investigate misuse | Server-only operational tools, least privilege; no general access to private notes by default |
| Professor/team member (later) | Shared reading lists and assignments | Not implemented in P0 |

## 3. Goals and metrics (initial hypotheses)

| Goal | Measure | Initial beta target |
|---|---|---|
| Speed up discovery | Median time to identify 3 usable sources | Under 10 minutes in controlled task |
| Complete end-to-end research flow | % testers who search, save and export unaided | At least 70% |
| Trustworthy metadata match | DOI/title match accuracy on manually reviewed test set | At least 99% |
| Demonstrate user value | % of testers indicating intent to reuse | At least 70% |
| Prevent cross-user access | Critical tenant-isolation defects | Zero at launch |

Targets are hypotheses, not market research findings.

## 4. Scope

### P0 — necessary for MVP launch
- **AUTH-01** Registration, sign-in/out, session handling, profile initialization.
- **PROJ-01** Create, rename, archive, delete and list student-owned research projects.
- **SEARCH-01** Search OpenAlex by keyword/query with pagination.
- **SEARCH-02** Filter on year range, publication type and open-access indicator when provider metadata supports them; UI labels must reflect provider meanings.
- **SOURCE-01** Normalize and display publication title, ordered authors, year/date, venue, publisher (when available), DOI, external URL and provider attribution.
- **SOURCE-02** Deduplicate by normalized DOI, then by provider-specific identifiers; do not silently merge uncertain matches.
- **VERIFY-01** Compare DOI/title and related metadata against Crossref where available; represent `verified`, `partially_verified`, `unknown`, `flagged` with reason and timestamp.
- **VERIFY-02** Clearly separate bibliographic verification from content quality, peer review and relevance.
- **SAVE-01** Save/remove a source under an owned project, with reading status and optional tags.
- **NOTE-01** Create/edit/delete freeform notes under a saved project source.
- **CITE-01** Generate APA 7 bibliography based on structured source metadata using CSL; report missing author/date/venue fields.
- **CITE-02** Copy references and export plain text or PDF from an authorized project; PDF is optional if export tooling makes it a launch risk, but plain text is required.
- **SEC-01** Enforce RLS and endpoint authorization for all user-owned objects.
- **OPS-01** Handle upstream failures, timeouts, quota limits and empty search responses gracefully.

### P1 — beta enhancements
- Curated official institution source directory with date of last review.
- Suggested search phrases and keyword expansion with transparent user confirmation.
- Search history and recent queries as an opt-in feature.
- RIS/BibTeX exports, citation style selection beyond APA 7.
- Metadata corrections workflow with provenance.

### P2 — explicitly out of scope
- Automated full-text copyright ingestion or paywall circumvention.
- Guaranteed peer-review status or automated truth ranking.
- Shared projects, classroom workspaces, professor admin, SSO.
- Real-time geopolitical map, diplomacy simulator, and international news aggregation.
- Paid subscriptions, mobile native applications, or automatic paper writing.

## 5. Core journeys

### J1 — Research discovery
1. Student signs in and opens Research Explorer.
2. Inputs `ASEAN role in South China Sea disputes` and selects optional filters.
3. Server searches OpenAlex and returns source cards with metadata and links.
4. Student opens source detail page; reads provenance and verification result.
5. Student creates or selects a project and saves the source.

**Acceptance:** Results display provenance and time of check; saving is idempotent within a project; no invented sources.

### J2 — Evaluate a source
1. Student opens a source's detail page.
2. System displays DOI resolution/metadata match, source type, date and evidence caveats.
3. If validation cannot complete, system shows `unknown` rather than `untrustworthy`.
4. Student opens original source and judges content themselves.

**Acceptance:** Every verification status has a specific reason and `checked_at`; no unsupported peer-reviewed claim.

### J3 — Annotated bibliography
1. Student opens a project with saved sources.
2. Adds notes, tags, and reading states.
3. Selects all or some items, previews references and metadata warnings.
4. Exports APA 7 bibliography as text (and PDF if enabled).

**Acceptance:** Only the selected project's authorized sources are exported; formatting is deterministic and testable.

### J4 — Return to unfinished research
1. Student returns and opens Dashboard.
2. Sees owned projects and counts of saved sources.
3. Resumes notes and source review without losing progress.

## 6. Functional rules and edge cases

- Zero results: show search refinements, never fabricate titles.
- Missing DOI: allow a source with provider ID and mark identity verification unknown/incomplete.
- Stale provider API: show the latest successful metadata fetch time; retry with bounded backoff.
- Duplicate save: return existing project-source record, not a duplicate.
- Article withdrawn/retracted: display credible notices when known; never equate missing notices with proof of good standing.
- Incomplete author metadata: warn before export; do not invent names.
- Project deletion: delete owned join rows and notes, but do not delete globally shared source metadata.
- A student's notes must not appear in another account even if both save the same source.

## 7. Nonfunctional requirements

- **Security:** RLS, server-only secrets, auth checks, CSRF-appropriate session protection, rate limits, validation.
- **Privacy:** minimal student profile; no mandatory university field; no sale of student research.
- **Reliability:** upstream failure isolation; retries only for safe/idempotent requests.
- **Accessibility:** keyboard navigation, visible focus, clear error messaging, WCAG 2.2 AA as design target.
- **Responsiveness:** usable desktop/tablet/mobile; prioritize desktop research workflows.
- **Performance targets:** internal dashboard P95 under 2s under beta load; third-party search P95 under 6s when healthy, monitored rather than guaranteed.
- **Observability:** sanitized structured logs, latency/error metrics, provider health; never log private note bodies.

## 8. Dependencies and risks

| Risk | Mitigation |
|---|---|
| Provider API limits / terms change | Adapter layer, caching, quota dashboard, checked terms before release |
| DOI metadata mistaken as quality guarantee | UI wording, evidence-specific statuses, no numeric quality score |
| Citation formatting errors | CSL library, gold-standard fixtures, metadata missing-field warnings |
| Student data leaks | RLS tests with two users, deny-by-default handlers, privileged credentials kept server-side |
| Overlarge scope | Release gate requires only P0 journey J1–J3 and tests |

## 9. Definition of done

All P0 requirements pass automated and manual tests; source provenance and verification caveats are visible; student data isolation has been penetration-tested at basic adversarial level; privacy and consent pages are ready; user testing demonstrates the complete discover → evaluate → save → annotate → cite flow.

---
## 10. Platform expansion — five integrated ATLAS pillars (supersedes research-only scope)
**Product vision:** ATLAS is an International Studies intelligence, learning, and applied research platform. Research discovery is the shared evidence backbone—not the entire product. All five pillars must appear in navigation, domain architecture, data model, API plan, UX specifications, and roadmap. Their production depth varies by release.

| Pillar | Student job | V1 core experience | Later enhancement |
|---|---|---|---|
| Global Intelligence Map (`MAP`) | Compare countries, economies, governments, diplomatic relationships and treaties | Map browsing, country fact sheets, year/source labels, country comparison | Relationship graph, richer treaty visualizations |
| World Affairs Explained (`AFFAIRS`) | Understand events with historical context and multiple viewpoints | Curated issue pages, stakeholder summaries, timelines, linked claims and sources | Personalized digest, monitored updates |
| Policy Research Workspace (`POLICY`) | Search, evaluate, analyze and produce a policy brief | Existing research library plus structured brief editor, policy-option matrix, citations, PDF export | Group collaboration, rubric feedback |
| Diplomacy Simulator (`SIM`) | Practice MUN, bilateral negotiation and crisis response | Scripted scenarios, country role cards, turn-based practice and debrief | AI counterparts with controlled, cited scenario context |
| International Studies Learning Hub (`LEARN`) | Master theories, international law, political systems and treaties | Curated lessons, source-linked flashcards/quizzes, learning progress | Adaptive plans, instructor courses |

### Release contract (avoid contradictory MVP claims)
- **Foundation release F0:** full credible-source research flow plus *read-only vertical slices* for MAP, AFFAIRS, POLICY, SIM and LEARN. These five modules are navigable and demonstrate a real workflow; they are not promised fully-fledged products at F0.
- **V1 integrated release:** MAP country profiles/comparisons, AFFAIRS explainers/timelines, POLICY brief export, SIM scripted practice, LEARN curated quizzes, plus strong search/library/citation tools.
- **V1.5/V2:** live source pipelines, recommendation systems, advanced mapping, AI roleplay, classroom collaboration, instructor features. Feature flags control incomplete modules.

### Requirements by pillar
**MAP:** MAP-01 country lookup using ISO 3166 alpha-2 codes; MAP-02 country profiles display polity/economic indicators with observation year, origin and last retrieval timestamp; MAP-03 two-country side-by-side comparison; MAP-04 bilateral relationship and treaty links are represented as *sourced records* and marked unknown if absent. Never imply contested borders are settled.

**AFFAIRS:** AFF-01 explainers show summary, event timeline, stakeholders, dated assertions and provenance; AFF-02 distinguish reported facts, analysis and unresolved claims; AFF-03 multiple perspectives represented fairly with attributable sources; AFF-04 show stale-content notice and editorial review timestamp; AFF-05 links to saved research projects.

**POLICY:** POL-01 policy brief with title, question, background, stakeholder assessment, options, trade-offs and recommendation; POL-02 attach saved verified-or-labeled sources to sections; POL-03 export PDF with bibliography; POL-04 warning for uncited claims, incomplete metadata and AI suggestions; POL-05 maintain version history (later release).

**SIM:** SIM-01 select curated scenario and role; SIM-02 provide factual scenario background and rules; SIM-03 record dialogue/decisions in a private session; SIM-04 debrief based on declared rubric (e.g. clarity, evidence, negotiation), never claim objective diplomatic scoring; SIM-05 AI counterparts require explicit labels, safety checks, per-user limits and disclosure that simulations are fictional.

**LEARN:** LRN-01 browse structured modules for IR theories, organizations, law, historical events and geography; LRN-02 complete a versioned quiz with explanatory feedback and sources; LRN-03 save progress and retry; LRN-04 show dates for mutable facts; LRN-05 educators may publish courses only in a later institutional phase.

### Pricing and access hypotheses
Free = basic country profiles, curated explainers, starter learning materials, limited research projects and scripted simulations. Student = *hypothesis* ₱99/month for increased research/storage limits, policy exports, extended practice and optional AI assistance. Institution = negotiated pricing for classes, educator controls and seats. No billing at F0; use entitlement flags and manual beta access. Validate price with students and account for API/AI costs before charging.

### Cross-module journeys
1. Student selects Philippines on MAP → opens sourced regional treaty/event records → saves a source in POLICY → drafts a brief → exports citations.
2. Student reads an AFFAIRS explainer → inspects its source ledger → compares affected states on MAP → completes a LEARN quiz → enters a SIM scenario.
3. Student starts a SIM negotiation → uses a role briefing from AFFAIRS and MAP → cites sources → receives rubric-based debrief → saves reflections.

### Global acceptance criteria
For each pillar, users can enter it from desktop/mobile navigation; content labels show source and date where applicable; missing data is explicit; privacy controls apply to personal content; screenshots/mock content are never substituted for real published evidence. Claims generated by AI must be distinguishable from verified metadata and attributable documentary records.

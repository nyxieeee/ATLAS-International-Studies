# Security, Privacy, and Reliability Design

**ATLAS MVP | Baseline design, not a completed security audit**

## 1. Data classification

| Data | Classification | Handling |
|---|---|---|
| Email/session credentials | Sensitive | Supabase Auth; never log passwords or tokens |
| Research questions, project titles, notes | Private student data | Authenticated owner-only RLS; no external AI transfer in P0 |
| Source metadata (title, DOI, authors) | Public/third-party metadata | Shared read, backend write, cite provenance and license restrictions |
| Search queries | Potentially personal | Only transmitted to needed search provider; private/opt-in history |
| Verification records | Derived metadata | Server-controlled; do not claim paper quality verified |
| Application logs | Operational | Sanitized, retention-limited and access-controlled |

## 2. Threat model

| Threat | Example | Control | Verification |
|---|---|---|---|
| Broken object authorization | Student A reads Student B project via UUID | DB RLS and explicit ownership queries | Two-user negative tests |
| Privileged key exposure | Service-role key in browser bundle | Server-only environment secrets | Build secret scan / bundle review |
| SSRF | Attacker supplies `http://127.0.0.1` as source URL | No arbitrary server-side URL fetch, strict API hostname allowlist | SSRF input tests |
| Provider poisoning | Malicious source metadata contains HTML/scripts | Escape/sanitize display, validate data types | XSS tests |
| Citation injection | Untrusted title inserted in exported HTML | Escaped output or plain text processing | Malicious metadata fixtures |
| Resource exhaustion | Rapid search / verify calls | Per-user/IP rate limits, timeouts, response size limits | Load tests |
| False academic credibility | `DOI exists` displayed as `trusted source` | Evidence-specific statuses and caveats | Product copy audit |
| Data loss | Accidental project deletion | Confirmation, backup, restore runbook | Restore drill |
| Data overcollection | Mandatory university/discipline | Optional profile; minimal telemetry | Privacy review |

## 3. RLS and authorization rules

- `profiles`: student reads/updates own row; profile created by trusted auth trigger.
- `projects`: owner CRUD.
- `project_sources`: CRUD when owning parent project.
- `source_notes`: CRUD when owning the note's project's source link.
- `search_history`: student sees/deletes only their own entries, if feature enabled.
- `sources`: authenticated read; no authenticated client write.
- `source_verifications`: authenticated read; only backend inserts/updates.

Do not assume Next.js route-level checks replace Postgres RLS. If backend uses a privileged service role for ingestion, isolate it from student-owned data operations and implement explicit ownership checks before privileged reads/writes.

## 4. Session and request controls

Use Supabase SSR recommended cookie/session practices; verify user identity in each protected server handler. Add Zod schemas for inputs, strict UUID validation, query length limits, tag counts, pagination maximums, and rate limiting. Set security headers such as CSP as feasible, secure cookies, HTTPS, and allowlisted CORS origins. Avoid logging email, private project text, notes, or session tokens.

## 5. Third-party handling

Search terms and publication IDs are sent to OpenAlex/Crossref to fulfill research requests. Disclose the third-party service usage in the privacy notice; review provider terms and current rate limits. Metadata may be incomplete, stale or inaccurate. Show provider name and retrieval time; avoid storing copyrighted full text or large unlicensed abstracts. External links should have safe navigation behavior.

## 6. Privacy and user controls

- Optional profile data; separate privacy notice and terms.
- Let students delete projects, notes, and optional search history.
- Define data retention and deletion schedule before beta launch. Avoid making unverified legal compliance claims.
- Document backup retention and account deletion effects, including any temporary backup copies.
- If launching in the Philippines, review relevant privacy obligations and use appropriate counsel/qualified advisor as needed.

## 7. Operational reliability

| Failure | Expected response |
|---|---|
| OpenAlex timeout | Bounded timeout; clear retry button; cached public results where allowed |
| Crossref unavailable | `unknown` check status with `checkedAt`/error context; never mark as failed content |
| Supabase unavailable | 503 and non-destructive UI state |
| Rate-limited provider | Respect Retry-After/backoff and show delayed-results state |
| Malformed source metadata | Reject/normalize individual record, preserve overall result set when safe |
| Export with missing metadata | Generate available references with warnings, not invented fields |

### Observability and response

Track request count, P95 latency, provider errors and 429 rate, cache hit rate, citation export failures, and unauthorized request attempts. Use correlation/request IDs without storing note bodies. Maintain a documented incident owner, escalation process, database backup procedure, and tested recovery plan before broad launch.

## 8. Launch security gates

- Two-user RLS matrix passes for every private table and API route.
- Signed-out clients cannot read projects, notes or search history.
- Authenticated users cannot write shared sources or verification records directly.
- All secrets absent from client JS bundles.
- Rate limits and provider failure behavior tested.
- Export verifies project ownership and sanitizes all content.
- Privacy copy describes data flows and user controls.

---
## 9. Platform-specific controls and trust analysis
| Surface | Threat / error | Controls |
|---|---|---|
| MAP geopolitics | misleading map borders, unsourced relations, stale statistics | neutral map labels; source and observation year per metric; do not infer recognition or sovereignty from boundary geometry |
| AFFAIRS feed | politically skewed summaries, misinformation, defamation | human editorial review, provenance per claim, dated updates, correction history, distinct fact/analysis labels |
| POLICY workspace | fabricated citations, unauthorized brief access, cross-project source IDOR | server-side owner checks, source-in-project association validation, CSL-based citations, explicit missing evidence flags |
| SIM roleplay | AI hallucinated state policy; prompt injection in retrieved content; stored sensitive transcripts | scripted defaults, label fictional content, bound tool use, retrieval allowlists, transcript privacy, report/stop controls |
| LEARN quizzes | hidden answer leakage, manipulated results, minors' data | server-side grading, withhold keys until submitted, anti-abuse limits, minimal data collection, age-appropriate privacy review |
| Tiers and billing | plan bypass, double spending, payment data exposure | server-side entitlements, idempotent webhook verification in future billing, no raw payment card storage |

**Common content protections:** (1) external source text is untrusted and never changes system rules; (2) don't scrape paywalled/full-text copyrighted material absent permission; (3) no published claim without provenance or marked uncertainty; (4) store reviewer ID, review time, and correction log on edited public content; (5) content and maps are educational and do not constitute authoritative legal/diplomatic advice.

**Permissions:** `student` may manage their own research and learning state. `editor` can draft/review/publish shared topics, scenarios and lessons via separately authorized admin endpoints. `admin` manages entitlements and audit logs. `instructor` is future-only and must not inherit broad student-data access automatically.

**Reliability:** each integration has independent circuit breakers, timeouts, caching and `last_success_at`; an outage in a country-statistics provider must not block research citations or the personal library. AI simulation is optional, fallback to a deterministic scenario if enabled feature cannot respond. Log provider ID/version and use OpenTelemetry-compatible tracing without logging private transcript text.

**Privacy operations:** account deletion removes notes, policy drafts, simulation dialogue and learning attempts according to a documented retention schedule. Public/source-linked metadata remains. Published user contributions must require explicit opt-in. Retain minimal event telemetry and disclose any LLM-provider data transfers.

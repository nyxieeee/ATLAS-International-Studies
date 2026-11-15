# System Architecture Document (SAD)

**ATLAS MVP 1.0 | Proposed architecture | 2026-11-11**

## 1. Context and technology decisions

ATLAS is a multi-user web application with a managed relational backend and third-party scholarly metadata integrations. Web clients must not access provider API credentials or privileged database credentials directly.

- UI: Next.js App Router / React / TypeScript, Tailwind CSS, shadcn/ui.
- API: Next.js server route handlers and service modules; runtime input validation with Zod.
- Auth + database: Supabase Auth, PostgreSQL, Row Level Security (RLS).
- Provider adapters: OpenAlex for discovery; Crossref for DOI metadata corroboration.
- Citation engine: Citation Style Language processor, e.g. citeproc-js with vetted APA 7 style assets.
- Hosting: Vercel for Next.js, Supabase managed DB/Auth.
- AI: not required in P0; optional controlled server-side enhancement later.

## 2. Container/component diagram

```mermaid
flowchart TB
    U[Student browser] -->|HTTPS| CDN[Vercel / Next.js UI]
    CDN -->|Authenticated requests| API[Next.js Route Handlers]
    API --> AUTH[Supabase Auth / JWT verification]
    API --> SVC[Application services]
    SVC --> SEARCH[Search and normalization service]
    SVC --> VERIFY[Verification service]
    SVC --> CITE[CSL citation service]
    SVC --> DB[(Supabase PostgreSQL + RLS)]
    SEARCH -->|HTTPS server-side| OA[OpenAlex API]
    VERIFY -->|HTTPS server-side| CR[Crossref API]
    API --> MON[Sanitized logs / metrics]
    SEARCH --> CACHE[(Bounded metadata cache)]
    VERIFY --> CACHE
```

### Modules and ownership

| Module | Responsibility | Must not do |
|---|---|---|
| UI | Compose searches, render source evidence, edit project content | Call privileged provider endpoints with secrets |
| Auth middleware/service | Resolve authenticated identity and guard requests | Assume a project ID implies ownership |
| Search adapter | Validate query; call OpenAlex; normalize and dedupe | Present unverified metadata as vetted claims |
| Verification adapter | Compare metadata with Crossref; persist status and evidence | Infer factual correctness or peer review |
| Project service | CRUD for owned projects and saved sources | Accept arbitrary `user_id` as authority |
| Notes service | Manage notes belonging to owned project source | Write notes to a global source |
| Citation service | Build CSL-JSON and format APA 7 | Make up missing metadata |
| Persistence | Data integrity, FKs, RLS, indexes | Allow client writes to normalized source metadata |

## 3. Main sequence: discovery to saving

```mermaid
sequenceDiagram
    actor Student
    participant UI as Next.js UI
    participant API as Research API
    participant OA as OpenAlex
    participant CR as Crossref
    participant DB as Supabase PostgreSQL
    Student->>UI: Submit keywords / filters
    UI->>API: GET /api/research/search
    API->>API: Authenticate, validate, rate-limit
    API->>OA: Search scholarly metadata
    OA-->>API: Publications + provider IDs
    API->>API: Normalize + deduplicate
    API-->>UI: Paginated results + provenance
    Student->>UI: Open one result
    UI->>API: GET /api/sources/:id
    API->>DB: Read normalized metadata
    opt verification refresh due
      API->>CR: Resolve DOI metadata
      CR-->>API: DOI metadata or unavailable
      API->>DB: Persist verification evidence
    end
    API-->>UI: Source details + check status
    Student->>UI: Save to project
    UI->>API: POST /api/projects/:id/sources
    API->>DB: Verify ownership + upsert project_sources
    DB-->>API: Saved record
    API-->>UI: 200/201 saved record
```

**Implementation clarification:** Search results must first be normalized and persisted by a trusted backend before `/api/sources/:id` and project-saving can use a canonical UUID; alternatively use a server-side source-resolution endpoint to persist on demand. Never trust client-supplied metadata as authoritative.

## 4. Network and trust boundaries

```mermaid
flowchart LR
    subgraph Public[Untrusted client zone]
      Browser[Browser]
    end
    subgraph App[Trusted app server zone]
      API[API and validation]
      ADAPTER[Provider adapters]
      CITER[Citation formatter]
    end
    subgraph Data[Managed data zone]
      DB[(PostgreSQL with RLS)]
      AUTH[Supabase Auth]
    end
    subgraph External[External providers]
      OA[OpenAlex]
      CR[Crossref]
    end
    Browser -->|HTTPS session| API
    API --> AUTH
    API --> DB
    API --> ADAPTER
    API --> CITER
    ADAPTER -->|server outbound HTTPS| OA
    ADAPTER -->|server outbound HTTPS| CR
```

- Browser input is untrusted even after authentication.
- Third-party metadata is untrusted **data**, never instructions or a source of authorization.
- Service-role database access is reserved for narrow server-only ingestion processes; user CRUD ideally uses user-scoped RLS credentials.
- DOI and external URL fields must be normalized; only allow `https://` external navigation and prevent server-side arbitrary URL fetching (SSRF).

## 5. Request, storage, and caching lifecycle

1. Validate query length, filter formats and pagination; authorize session.
2. Search cache with normalized key and short TTL; avoid caching user-specific annotations in a shared cache.
3. Request provider through an adapter; handle timeout, 429 and invalid data.
4. Normalize metadata; upsert shared sources only via backend worker/service using constrained permissions.
5. Record verification evidence on-demand/asynchronously when practical, with `checked_at` and provider name.
6. Return provenance, verification caveat and external original URL.
7. Save project-specific associations via an authenticated/RLS-enforced request.
8. Export bibliography by selecting from the student's project and transforming to CSL-JSON.

### Caching strategy

- Search result caches may store **public bibliographic metadata only** for a short, configurable TTL.
- Metadata resolution status has its own TTL and may remain `unknown` if provider checks fail.
- Notes, projects and other personal data are never cached in cross-user keys.
- Respect provider terms, rate limits and cache directives.

## 6. Deployment environments

| Environment | Purpose | Data policy |
|---|---|---|
| Local | Developer work and unit tests | Synthetic data only |
| Preview/staging | Integration, QA, automated E2E | Separate Supabase project; test accounts |
| Production | Student beta | Separate keys, migrations, backups, alerting |

Environment secrets: Supabase server-only credentials, third-party API tokens (if required), telemetry credentials. Public Supabase URL and publishable/anon key alone are not privileged but must still be paired with correct RLS.

## 7. Architectural decision records (ADRs)

- **ADR-001 — Web-first:** Responsive website before mobile native apps; avoids duplicate development and makes academic workflows desktop-friendly.
- **ADR-002 — Shared metadata / private annotations:** Bibliography records are globally reusable, user notes live under saved join rows; prevents duplication and data leakage.
- **ADR-003 — OpenAlex primary search:** Start with one provider and explicit adapter contract; add providers after observing discovery gaps.
- **ADR-004 — Crossref verification is not truth verification:** Metadata confidence indicators must state exactly what was tested.
- **ADR-005 — No P0 generative AI:** Evidence-first product reduces cost, unsupported claims and scope risk.
- **ADR-006 — CSL citations:** Deterministic formatting and test fixtures instead of freeform text generation.

## 8. Capacity and failures

Plan for an initial limited student beta, not unproven massive-scale traffic. Log P50/P95 latency, failure and provider throttling ratios. Degrade gracefully with cached source metadata and explicit `verification temporarily unavailable` banners. Exponential retry applies only to idempotent reads and is bounded. Backups must be enabled and restoration exercised before broad launch.

---
## 9. Integrated platform architecture (five pillars)
```mermaid
flowchart TB
 U[Student browser / Next.js] --> BFF[Authenticated API / BFF]
 BFF --> R[Research & Citation domain]
 BFF --> M[Country Intelligence domain]
 BFF --> A[Affairs & Source Ledger domain]
 BFF --> P[Policy Brief domain]
 BFF --> S[Simulation domain]
 BFF --> L[Learning domain]
 BFF --> E[Entitlements / Billing boundary]
 R & M & A & P & S & L & E --> DB[(Supabase PostgreSQL + RLS)]
 R --> OA[OpenAlex / Crossref]
 M --> WB[World Bank / curated government data]
 A --> CUR[Editorial / official source links]
 P --> PDF[Server PDF & CSL citation renderer]
 S --> LLM[Optional LLM gateway — later phase]
 L --> CUR
```
**Shared kernel:** authentication, authorizations, source/provenance ledger, canonical country IDs, project and citation data, content moderation, analytics and feature flags. Domain logic lives in server-side modules and versioned migrations. Client displays cached normalized records, never authoritative metrics computed from unverified LLM output.

| Service/module | Inputs | Outputs | Storage | External dependence |
|---|---|---|---|---|
| Country intelligence | ISO code, indicator ID, year | country facts and comparison | `countries`, `country_indicators`, `country_relationships`, `treaties` | World Bank and curated official sources |
| World affairs | topic ID, editorial updates | explainer, timeline, source ledger | `affairs_topics`, `affairs_events`, `content_sources` | licensed/linked sources; human review |
| Policy writer | project and selected evidence | structured brief, PDF | `policy_briefs`, `policy_brief_sources` | PDF renderer/CSL |
| Simulation | scenario, selected role, turns | transcript, rubric feedback | `sim_scenarios`, `sim_sessions`, `sim_turns` | curated scripts; optional AI gateway |
| Learning | lesson, quiz, answer | explanation and progress | `learning_modules`, `lessons`, `quiz_questions`, `quiz_attempts` | curated/editor-reviewed content |
| Entitlements | plan, feature, usage | allow/deny + remaining quota | `subscription_plans`, `user_entitlements` | no payment provider in F0 |

### Architectural constraints
- External providers have adapters, attribution/licensing checks, quotas and cached responses. The World Bank API is a proposed source for country indicators; governmental systems and treaty registries require separately verified integration policies.
- `content_sources` is the shared provenance link for manually curated content; research `sources` is the scholarly citation registry. The two may refer to the same real-world document but must not silently collapse into an inaccurate bibliographic object.
- Use editorial publication state `draft → in_review → published → archived` for country intelligence notes, affairs explanations, simulated scenarios and lessons. Publish is a trusted server action, not accessible through a student browser.
- Keep AI retrieval behind a bounded service that returns source IDs, quote permissions, confidence/uncertainty and model/version metadata. No AI integration required for scripted V1 SIM.
- Use server-generated signed exports; do not expose private workspace data in storage public buckets. Protect generated files with expiry and owner checks.
- Use content revision timestamp and observable data `as_of_date`, not just `updated_at`, for world affairs and macroeconomic statistics.

### Sequence: issue → policy → simulation
```mermaid
sequenceDiagram
 actor U as Student
 participant UI as ATLAS UI
 participant API as Domain API
 participant DB as Supabase
 U->>UI: Open issue explainer
 UI->>API: GET /api/affairs/topics/{id}
 API->>DB: Published content + sources
 DB-->>API: Dated claims and provenance
 API-->>UI: Overview and source ledger
 U->>UI: Save evidence and create brief
 UI->>API: POST /api/policy-briefs
 API->>DB: Owner-scoped brief and evidence refs
 U->>UI: Practice diplomacy scenario
 UI->>API: POST /api/simulations/sessions
 API->>DB: Validate scenario + create owned session
 API-->>UI: Role brief and scripted first turn
```

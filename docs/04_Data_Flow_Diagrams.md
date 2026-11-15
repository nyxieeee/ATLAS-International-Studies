# Data Flow Diagrams (DFD)

**ATLAS MVP | Context and Level-1 diagrams | v1.0**

## DFD notation

- Square/rectangle: external actor or external service.
- Rounded node: transformation/process.
- Cylinder: persistent data store.
- Arrow label: actual information exchanged (not control-only arrows).

## Level 0 — System context

```mermaid
flowchart LR
    STUDENT[International Studies student]
    OA[OpenAlex]
    CR[Crossref]
    ATLAS([0. ATLAS Research Platform])
    STUDENT -->|Login, research query, project actions, notes, export request| ATLAS
    ATLAS -->|Search results, metadata status, saved projects, bibliography| STUDENT
    ATLAS -->|Publication search query| OA
    OA -->|Publication metadata and identifiers| ATLAS
    ATLAS -->|DOI metadata lookup| CR
    CR -->|DOI metadata, status or error| ATLAS
```

**Boundary:** Student data enters ATLAS through authenticated HTTPS; provider metadata enters from external systems and is treated as untrusted input. No notes or private project data are sent to OpenAlex or Crossref in P0; only user-entered search terms and publication identifiers as necessary.

## Level 1 — Decomposition

```mermaid
flowchart LR
    STUDENT[Student]
    OA[OpenAlex API]
    CR[Crossref API]

    P1([1.0 Authenticate and authorize])
    P2([2.0 Search and normalize])
    P3([3.0 Verify source identity])
    P4([4.0 Manage projects and notes])
    P5([5.0 Generate citations])

    D1[(D1 Profiles)]
    D2[(D2 Projects)]
    D3[(D3 Shared sources)]
    D4[(D4 Project source links)]
    D5[(D5 Private source notes)]
    D6[(D6 Verification evidence)]
    AUTH[Supabase Auth]

    STUDENT -->|Credentials/session| P1
    P1 <-->|Session validation| AUTH
    P1 <-->|Student profile| D1
    STUDENT -->|Keywords and filters| P2
    P2 <-->|Publication search metadata| OA
    P2 -->|Normalized source records| D3
    P2 -->|Results + provenance| STUDENT
    STUDENT -->|Inspect source| P3
    P3 -->|DOI lookup| CR
    CR -->|DOI metadata| P3
    D3 -->|Existing source metadata| P3
    P3 -->|Verification status and evidence| D6
    P3 -->|Status and explanation| STUDENT
    STUDENT -->|Project CRUD, save action, notes| P4
    P4 <-->|Owned projects| D2
    P4 <-->|Project/source links| D4
    P4 <-->|Private notes| D5
    P4 -->|Project and notes response| STUDENT
    STUDENT -->|Bibliography request| P5
    D2 -->|Project ownership| P5
    D4 -->|Selected source references| P5
    D3 -->|Bibliographic metadata| P5
    P5 -->|APA 7 citations / missing-field warnings| STUDENT
```

**Authorization note:** The diagram omits repeated calls to Process 1 for clarity. Each request to Processes 2–5 must authenticate (except any deliberately public read-only discovery route), enforce authorization and validate inputs. Data stores are logical and implemented in Supabase PostgreSQL.

## Detailed process: search, check, save

```mermaid
flowchart TD
    A([Student enters question]) --> B[Validate search input]
    B --> C{Valid session and rate limit?}
    C -- No --> X[Return 401, 429 or validation error]
    C -- Yes --> D[Request OpenAlex via server]
    D --> E{Provider available?}
    E -- No --> F[Return explicit provider error or permitted cached results]
    E -- Yes --> G[Normalize metadata, attribute source]
    G --> H[Trusted backend upsert shared source]
    H --> I[Display source cards]
    I --> J{Student selects source?}
    J -- No --> K([End])
    J -- Yes --> L[Retrieve canonical source]
    L --> M[Optional Crossref DOI check]
    M --> N[Display evidence, timestamp and limitations]
    N --> O{Save to project?}
    O -- No --> K
    O -- Yes --> P[Authorize project owner and upsert association]
    P --> Q[Respond with saved state]
```

## Detailed process: bibliography

```mermaid
flowchart TD
    A[Student requests project bibliography] --> B[Authenticate user]
    B --> C{Owns project?}
    C -- No --> D[Return 404 or 403 without leaking project details]
    C -- Yes --> E[Load saved source metadata]
    E --> F[Map to structured CSL-JSON]
    F --> G[Detect missing required fields]
    G --> H[Format with pinned APA 7 CSL style]
    H --> I[Provide text export and warning list]
```

## DFD data inventory

| Data flow | Classification | Source → destination | Persistence |
|---|---|---|---|
| Credentials/session | Sensitive | Student → Auth service | Managed by Auth provider |
| Search terms | Potentially personal | Student → API → OpenAlex | Optional private history only |
| DOI / title metadata | Public or licensed metadata | Providers → service → shared source store | Yes, per provider terms |
| Verification evidence | Derived shared metadata | Crossref → service → verification store | Yes with timestamps |
| Project titles/questions | Private user data | Student → project store | Yes |
| Annotations | Private user data | Student → note store | Yes, scoped to owner |
| Bibliography output | User-specific derivative | Citation service → student | Generated on demand |

## Privacy principles

- Do not send private notes or full student project records to external research providers.
- Keep student authorization checks within every relevant process, not only at sign-in.
- Provider response data must never bypass validation before shared persistence or user-visible output.

---
## Level 1 expanded — all ATLAS pillars
```mermaid
flowchart LR
 STUDENT[Student] --> AUTH[1. Identity and entitlements]
 AUTH --> MAP[2. Country intelligence]
 AUTH --> AFF[3. Affairs explained]
 AUTH --> POL[4. Policy workspace]
 AUTH --> SIM[5. Diplomacy simulation]
 AUTH --> LEARN[6. Learning hub]
 MAP <--> D1[(Countries, indicators, treaties)]
 AFF <--> D2[(Topics, timelines, source ledger)]
 POL <--> D3[(Projects, sources, briefs)]
 SIM <--> D4[(Scenarios, sessions, turns)]
 LEARN <--> D5[(Lessons, quizzes, attempts)]
 PROVIDERS[Official and academic data providers] --> INGEST[7. Normalize, verify and review]
 INGEST --> D1
 INGEST --> D2
 INGEST --> D3
 EDITOR[Trusted editor] --> INGEST
 MAP --> STUDENT
 AFF --> STUDENT
 POL --> STUDENT
 SIM --> STUDENT
 LEARN --> STUDENT
```
### DFD 2A — map and affairs provenance
```mermaid
flowchart LR
 U[Student country/topic query] --> API[Map or affairs API]
 API --> C[(Published country and affair data)]
 C --> JOIN[Join dated claims to supporting links]
 JOIN --> CHECK{Evidence and dates present?}
 CHECK -->|Yes| VIEW[Display sourced fact, timeline and indicator]
 CHECK -->|No| WARN[Mark unknown, stale or awaiting verification]
 VIEW --> U
 WARN --> U
```
### DFD 2B — evidence-backed policy brief
```mermaid
flowchart LR
 U[Student] --> EDIT[Brief editor]
 EDIT --> P[(Owned briefs)]
 EDIT --> REF[(Owned saved sources)]
 REF --> VAL[Check bibliographic completeness]
 P --> VAL
 VAL --> OUT[PDF plus CSL citations]
 OUT --> U
```
### DFD 2C — diplomatic practice
```mermaid
flowchart LR
 U[Student] --> SELECT[Choose published scenario and role]
 SELECT --> RULES[(Scenario facts and rubric)]
 RULES --> SESSION[Open owner-scoped session]
 U --> TURN[Submit turn or decision]
 TURN --> SESSION
 SESSION --> REVIEW[Rule-based feedback / optional gated AI]
 REVIEW --> U
```
### DFD 2D — learning and access control
```mermaid
flowchart LR
 U[Student] --> GATE[Auth and feature entitlement]
 GATE --> CONTENT[(Published modules, lesson versions)]
 CONTENT --> QUIZ[Deliver quiz without answer key]
 U --> ANSWER[Submit selected answer]
 ANSWER --> GRADE[Server grade against stored answer key]
 GRADE --> PROGRESS[(User quiz attempts)]
 GRADE --> U
```
**Data boundaries:** authenticated users can modify only personal projects, briefs, sim transcripts and quiz attempts. Editors publish shared content. Providers supply external evidence and never directly write trusted public tables. AI-generated text is labeled and cannot bypass publication review.

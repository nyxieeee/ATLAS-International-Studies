# ATLAS — Cross-document Feature Traceability Matrix

**Version:** 2.0 planning revision · **Status:** Proposed architecture; not a deployment claim.

This is the canonical crosswalk for the five requested platform features and the foundational research engine. Every module is included in the PRD, architecture, ERD/SQL, DFD, APIs, security, delivery roadmap, QA, UX and `design.md`.

| Module | PRD requirement IDs | Core persistent entities | API paths | UX routes | Suggested release |
|---|---|---|---|---|---|
| Credible research | existing J1–J4 | `sources`, `source_verifications`, `projects`, `project_sources` | `/api/research/*`, `/api/projects/*` | `/research`, `/projects`, `/library` | F0 |
| Global Intelligence Map | MAP-01…04 | `countries`, `country_indicators`, `country_relationships`, `treaties`, `country_treaties` | `/api/countries/*`, `/api/treaties` | `/intelligence` | F2 |
| World Affairs Explained | AFF-01…05 | `affairs_topics`, `affairs_events`, `content_sources` | `/api/affairs/topics/*` | `/affairs` | F2 |
| Policy Research Workspace | POL-01…05 | `policy_briefs`, `policy_brief_sources`, research tables | `/api/policy-briefs/*` | `/policy` | F3 |
| Diplomacy Simulator | SIM-01…05 | `sim_scenarios`, `sim_sessions`, `sim_turns` | `/api/simulations/*` | `/simulations` | F4 |
| International Studies Learning Hub | LRN-01…05 | `learning_modules`, `lessons`, `quiz_questions`, `quiz_attempts` | `/api/learning/*` | `/learn` | F4 |
| Free/Student/Institution concept | pricing hypotheses | `subscription_plans`, `user_entitlements` | `/api/me/entitlements` | `/settings/plan` | F1 flags; billing later |

## Compliance/quality invariants
- No invented sources, geopolitical relationships, DOI validation, country indicators, or quiz evidence.
- Facts vs perspectives vs simulation fiction are clearly distinguished.
- Student private data stays owner-scoped, with database RLS + server authorization.
- Editors control published affairs, lessons and diplomatic scenarios; raw AI output cannot auto-publish.
- DOI verification checks bibliographic identity, **not** accuracy of a paper's claims.
- ₱99/month is a **pricing hypothesis**, not an implemented subscription charge.

## Deferred features
Production-grade AI conversational diplomacy, continuous automatic news ingestion, paid memberships, institutional faculty analytics, and complex relationship network scoring are not in the F0 minimum release. Feature flags are mandatory where preview routes precede implementation.

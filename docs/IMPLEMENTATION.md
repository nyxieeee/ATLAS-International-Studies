# ATLAS implementation

For the current product and setup, see [CURRENT_PRODUCT.md](CURRENT_PRODUCT.md). Earlier entries below record historical implementation decisions.

## Run locally

Use a current Node.js LTS release (Node 22.18+ recommended).

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. `npm.cmd run build` creates the production build; `npm.cmd start` serves it. To use another port: `npm.cmd start -- --port 3001`.

## Implemented workflows

The current application uses six main areas: Home, Explore, Search, Library, Projects and Practice. See [CURRENT_PRODUCT.md](CURRENT_PRODUCT.md) for the implemented flows and map data freshness. Notes and separate policy briefs are organized inside Projects; Settings supports backup restoration. Static lesson/explainer previews, scripted scenarios and empty country tabs were removed.

## Enable cloud accounts and sync

1. Create or select a Supabase project for ATLAS. No live Supabase project or credentials were available during implementation.
2. Run [migrations/001_cloud_workspaces.sql](../migrations/001_cloud_workspaces.sql) once in its SQL editor. This creates an independent, owner-scoped `atlas_workspaces` table; it does not require applying the older proposed `schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use the public publishable key; never put a service-role key in `NEXT_PUBLIC_*` variables.
4. Enable Supabase email/password authentication and set the allowed site/redirect URLs for your deployment. Configure email delivery/confirmation as needed.
5. Restart the app. Open **Settings & account** to create an account or sign in. Guest content stays separate; use **Import guest workspace** to copy it into the selected cloud account.

Cloud synchronization stores one versioned JSON snapshot per user containing projects, notes, policy drafts/evidence, simulation state, progress and preferences. RLS authorizes database access using the authenticated JWT. Client identity is not the authorization boundary. There is no service-role credential in this application.

Edits save to account-specific browser storage immediately and upload after a short idle period. Offline edits retain their device copy. Updates use an expected revision, and a database trigger rejects revision-skipping/blind writes. Conflicting devices pause uploads and let the user export a backup, load the cloud copy, or explicitly replace it with the device copy. There is no automatic merge or realtime collaboration. A 4 MB server-side snapshot limit applies. Guest content and separate cloud accounts use different local storage keys; sign-out restores the guest workspace.

This snapshot model is a foundation sync implementation, not the normalized domain services proposed by `schema.sql`. Production rollout still needs live two-user RLS tests, account lifecycle and recovery policy, backup/retention decisions, monitoring, rate limits and device/privacy review. Account copies remain cached on the browser after sign-out; use a private browser on shared devices. Cloud notes are not end-to-end encrypted.

## Evidence and provider configuration

Optional `OPENALEX_API_KEY` in `.env.local` increases the provider allowance. This key stays server-side. Fixed upstream hosts, validated query inputs, and bounded timeouts are used for research integrations. Unavailable data stays unavailable; no publications or indicator values are fabricated. Bibliographic identity does not imply a paper's claims are accurate or peer reviewed.

Citation-js supplies the APA CSL processor. Author display names are parsed into given/family names; review complex names and incomplete metadata. PDF export uses the browser's print dialog; it is not a signed server-generated PDF service.

Rich notes are sanitized with DOMPurify and a restricted style allowlist on paste, storage, rendering and HTML export. No scripts, event handlers, embeds or remote images are permitted in formatted note content.

## Checks and limits

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

With a server running, enable the API tests:

```powershell
$env:ATLAS_TEST_URL='http://localhost:3000'
npm.cmd test
```

Tests cover citation formatting, input validation, HTML sanitization, eraser geometry, stale evidence detection, optimistic synchronization and provider error handling. A separate live RLS test is included in `tests/cloud-rls.test.mjs`. It requires an isolated Supabase test project with the migration applied and two **empty disposable test accounts**. Set `ATLAS_RLS_TEST_URL`, `ATLAS_RLS_TEST_PUBLIC_KEY`, and `ATLAS_RLS_TEST_A_EMAIL`, `ATLAS_RLS_TEST_A_PASSWORD`, `ATLAS_RLS_TEST_B_EMAIL`, `ATLAS_RLS_TEST_B_PASSWORD`. The test refuses to overwrite existing workspaces and cleans up only its newly inserted fixtures. Never use production accounts. Credentials are read from environment variables and not printed.

Live cloud authentication/sync/RLS remain unverified without that configuration. Browser and Windows inspection tools were unavailable, so desktop/mobile appearance, stylus behavior and print layouts require visual acceptance testing. Automated pure-function and API checks do not replace these tests.

## Attribution

- Original identity reference and `design.md`: reconstructed code-native SVG interpretation, not an approved brand master.
- Notepad interaction reference: user's local France Notes project; original project left unchanged.
- Map: Natural Earth via `world-atlas`, public domain. Boundaries are illustrative and do not adjudicate sovereignty.
- Fonts: Google Fonts DM Sans and Source Serif 4, with system fallbacks.
- API references: [OpenAlex](https://help.openalex.org/api/), [World Bank](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392), [Supabase authentication](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) and [auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange).

No billing, editorial CMS, or live news service is implemented. AI roleplay is available in the AI Study Studio as described below.

## AI study, OCR and Edge neural speech (current personal-app scope)

Student plans, subscriptions, billing concepts and paid feature gates have been removed from the application UI and the proposed `schema.sql` plan tables/seeds/policies. Optional cloud sync remains for a personal workspace across devices. Older planning documents contain historical commercial proposals; the current implementation supersedes those proposals.

The **AI Study Studio** and **AI Recitation** navigation entries support tutoring, one-question-at-a-time recitation, adaptive fictional diplomacy roleplay, scenario generation, study reviewers, and research questions. Sessions are saved with the workspace, can be exported as transcripts, and AI responses can be saved as explicitly labeled notes. Lesson pages open related recitation practice; scripted scenarios open related AI roleplay. Context is limited to the topic and a note the user explicitly selects. AI outputs do not enter the scholarly source registry or become verified publications.

### AI configuration

Add these server-only keys to `.env.local` and restart the app:

```dotenv
MISTRAL_API_KEY=your_mistral_key
```

The default feature routing follows the inspected France Notes implementation:

| Feature | Provider/model |
|---|---|
| Tutoring, recitations, simulations, scenarios, image transcription | Mistral / `mistral-small-latest` |
| Study reviewers | Mistral / `open-mistral-nemo` |
| Research questions (no live web grounding) | Mistral / `mistral-small-latest` |

Optional server-only overrides: `MISTRAL_CHAT_MODEL`, `MISTRAL_STUDY_MODEL`. Model availability depends on the provider account. Missing/retired models and failed requests produce explicit errors; there is no silent fabricated response or cross-provider substitution. No credentials were copied from France Notes.

Use **Notepad → Import / OCR** to extract text from PNG/JPEG/WebP, scanned or text PDFs, DOCX, TXT, Markdown, and CSV. Image and scanned-page transcription uses Mistral vision, matching France Notes, rather than Mistral's separate Document AI OCR model. Text-layer PDF and DOCX extraction run locally. Limits: 10 MB/file, 40 PDF pages, 200,000 extracted characters. Scanned-page failures are reported and marked in partial output. Review and edit text before saving a note. Images are resized locally before submission. Raw uploaded files are not saved to the workspace or an application upload bucket.

`postinstall` copies the installed PDF.js worker into `public/`; no third-party worker CDN is used. Run `node scripts/setup-pdf-worker.mjs` manually if installation scripts were disabled. The importer is loaded only when used in the browser.

### Speech

The `/api/tts` Node route uses `msedge-tts`, the same package as France Notes, to synthesize Microsoft Edge neural MP3 speech. No speech API key is required by this integration; service availability remains external. The endpoint returns base64 MP3 JSON, matching France Notes. ATLAS was verified to receive a real `audio/mpeg` response (38,880 bytes) for a short test statement.

Read-aloud controls are available for scripted chair/delegate turns, scenario briefings, lessons, affairs introductions, typed notes, imported text, policy briefs and AI responses. AI Studio offers opt-in automatic reply narration. All readers share one player, so a new reader stops the previous one. Long text uses approximately 220-character sentence batches, with two upcoming clips prefetched, retry, pause/resume/stop, voice previews and adjustable speed. Separate coach and counterpart preferences default to Andrew and Ava. **Settings → Neural voice** includes Andrew, Ava, Brian, Emma, James/Rosa (Philippine English), Ryan/Sonia (UK), Christopher and Jenny. Text is XML-escaped before synthesis. Like France Notes, failed neural requests fall back to browser speech. The UI explicitly labels device-voice fallback. Autoplay-blocked neural playback instead requests a user tap. Browser autoplay rules may still require a click, especially on iOS.

Selected AI conversations/context go to Mistral; read-aloud text goes to Microsoft's speech service. The controls explain this before submission. Responses and audio are returned with `no-store`; provider credentials remain server-only. Local request size/concurrency protections are technical safeguards, not plan limits.

### Latest validation

Production compilation/TypeScript and 40 automated checks pass, including model routing, OCR input validation, XML escaping, speech chunking and AI/audio API validation. Live Edge MP3 synthesis succeeds. AI generation/OCR could not be tested against paid/provider endpoints because the Mistral key is not configured. The live Supabase isolation test remains skipped without its test accounts. Browser visual/audio playback and scanned-PDF rendering still need device acceptance testing because the browser inspection tools were unavailable.

Implementation references: [Mistral vision](https://docs.mistral.ai/inference/conversations/vision), the installed `msedge-tts` README/API.



Current provider scope: **Mistral only** for every AI mode. No Google AI key, endpoint, provider fallback, or web-grounding claim remains. The speech pipeline was checked against France Notes’ `api/tts.ts`, `src/lib/elevenLabsTts.ts`, and `src/lib/voices.ts`; nursing-specific speaker names were adapted to coach/counterpart roles. Live base64 MP3 synthesis returned 54,144 audio bytes. Mock playback tests cover prefetching, cancellation, autoplay blocking, labeled browser fallback and separate voice preferences. Physical iPad/Safari playback still needs device verification.

## Student-owned file workflow

The study flow now starts with the student's materials, directly in **AI Study Studio / AI Recitation**:

1. Upload or drag in readings, lecture slides, notes, or scans (multiple files supported).
2. Select **Extract**, review/correct each file's extracted text, then add it to session materials.
3. Select the documents to study, choose recitation, simulation, tutoring, scenario building or review, and optionally provide a focus.
4. Begin practice. **Base questions and feedback on my selected materials** is enabled by default. The session records the selected filenames and document IDs. General study mode is an explicit opt-out.

PDF, DOCX, PPTX, TXT, Markdown, CSV, PNG, JPEG and WebP are supported. PowerPoint extraction is local, text-only, up to 200 slides; embedded diagrams/images, animations and speaker notes are not extracted. Existing PDF/image OCR uses Mistral. Imported text is saved in a material library within the workspace and is included in account sync/JSON exports. Original binary files are not stored. Five files can be processed in one batch; more batches can be added.

Long documents are chunked with overlap. Each AI turn selects relevant excerpts using the student's focus/latest response, includes material from each selected file within the context budget, and labels excerpts by document. This is lexical retrieval, not an embedding index or a guarantee of exhaustive reading. The model is instructed to cite document labels, acknowledge missing information, and clearly label invented simulation developments. Uploads are user material, not independently verified scholarly sources. Removing a required material prevents the old session from silently proceeding without it.

The context-building, local text and PowerPoint extraction, cancellation, and source-only validation tests pass. The production build and 47 checks pass; live AI/OCR still require the Mistral key. Browser upload/drag/drop and PDF/image rendering require device QA because browser inspection tools were unavailable. TTS is an optional way to hear practice dialogue; no podcast generation workflow is introduced.

## Uniform interface styling

`app/design-system.css` is loaded after module layouts and is the shared source for repeated visual styling. It defines panel/control/dialog radii, panel padding, layout gaps, type sizes, control heights, feedback colors and light/dark variants. Repeated panels, form fields, action rows, badges, toolbars, empty states and dialogs use the same scale across map, research, policy, notes, materials, AI practice, lessons and settings. Reading documents and editor surfaces retain their task-specific layouts.

Cards stretch within a grid and use flexible content so actions align without clipping long titles or descriptions. Mobile uses 16px panel padding, 44px standard controls and a 28px page title; desktop uses 20–24px panel padding, 40px controls and a 32px title. Compact editor/speech controls use a separate consistent size. Rich-text note content keeps its user-applied formatting. Print views continue to hide interactive chrome.

Production compilation and TypeScript pass. Browser/Windows inspection tools remained unavailable, so screenshot, computed-layout and device visual acceptance testing could not be performed.

## AI coverage across learning and research

Mistral now supports:

| Workflow | AI behavior |
|---|---|
| Quizzes | Generates 3/5/10 multiple-choice questions at a selected difficulty from uploaded materials or notes; supplies answer explanations and exact supporting quotes. |
| Flashcards | Generates front/back cards with material references, reveal controls and persistent self-reported review progress. |
| Recitations | Asks one question at a time, responds to the student's actual answer, and provides an on-request debrief. |
| Simulations / MUN / crisis practice | Opens AI practice from the module by default; adaptive roleplay and scenario generation use the selected material. Scripted examples remain explicitly available. |
| Debriefs | Qualitative feedback on the actual transcript, with specific next practice goals; no political-correctness scores. |
| Notes | OCR import plus an AI summary/key-points action; summaries can be saved as separate labeled notes. |
| Policy workspace | AI feedback on argument structure, alternatives, feasibility and unsupported claims; no automatic edits or invented citations. |
| Learning | AI lesson explanations and illustrative examples alongside the original readings. |
| Source detail | AI relevance guidance from metadata and the research question; no automatic truth or peer-review rating. |
| Country/affairs views | On-demand explanation of the supplied profile/indicator or explainer content; missing data and freshness limits are retained. |
| Study Studio | General material-based tutoring, study reviewers, research questions, scenarios, recitations and roleplay. |

Verified bibliographic checks, citation formatting, indicator retrieval, storage, and multiple-choice scoring remain deterministic/provider-backed. AI is not used to invent official data or source-verification results. Edge neural speech reads AI or authored text and remains a separate Microsoft service.

### Quiz behavior and persistence

`/api/practice` calls Mistral Small with structured JSON output. Generated items are validated for shape, duplicate prompts/options, valid answer indexes and exact quote matches to the supplied excerpts. A matching quote establishes provenance, not semantic correctness; users must still review the generated answer.

The browser receives quiz questions/options and an AES-GCM encrypted answer token. The answer key, explanations and quotes are returned only when the completed answers are submitted to the grading endpoint. The server calculates the score, ignoring client-supplied scores. This is personal practice, not a secure proctored examination; a student can submit guesses to reveal answers. Flashcard backs are intentionally available for review.

Set a stable server-only `QUIZ_SIGNING_SECRET` (a random 32+ character secret) for grading saved quizzes across deployments/restarts. Without it, a process-local key is used; a server restart may require regenerating the quiz. Tokens expire after 30 days. Saved practice sets, responses, results and flashcard review progress are included in the workspace backup/sync. AI feature failures show an error and retry path; no fictional quiz is substituted.

Validation: production build and 56 automated checks pass; one live Supabase test remains skipped. New checks cover generated item validation, exact source support, hidden answer payloads, token integrity/expiry, deterministic scoring and invalid practice requests. Live Mistral generation still cannot be verified until `MISTRAL_API_KEY` is configured. Browser/device visual checks remain unavailable in this environment.

## ATLAS Search — approved-source discovery

The Research navigation and global search now open **ATLAS Search**. This is ATLAS' own search interface, publisher policy, result normalization, keyword ranking, deduplication and project-saving workflow. It federates external catalogs/feeds; it is **not** a claim that ATLAS has independently crawled or indexed the entire web.

### Source policy

`lib/search-policy.mjs` is the authoritative versioned allowlist of 24 sources. It includes official institutions (UN, World Bank, IMF, OECD, WTO, WHO, UNESCO, UNHCR, UNFCCC, EU, ASEAN, ICJ and PCA), research organizations (ICRC, SIPRI and Our World in Data), selected academic publishers (Cambridge, Oxford, SAGE, Springer Nature and Wiley), and Reuters, AP and BBC as requested.

A result is displayed only if its HTTPS destination matches an approved domain or real subdomain. Lookalike suffixes, user-info URLs, nonstandard ports, unsupported protocols and known off-domain redirect parameters are rejected. The gate is applied after each provider response, including optional web discovery; user query operators cannot widen the displayed source list. The older OpenAlex endpoint also filters destinations against this policy.

Approval identifies publisher origin, not factual correctness, neutrality, peer review or article quality. Research, news, official documents and analysis retain separate category labels. External links may redirect after the user opens them; the policy checks the returned destination URL and common redirect parameters, not every future publisher navigation. Source inclusion is code-managed; students cannot inject an arbitrary source through a query parameter.

### Enabled discovery

- **World Bank Documents API:** real public document records, dates and descriptions.
- **Crossref metadata API:** real scholarly metadata, retained only when the record supplies an approved publisher landing URL. A DOI alone is not an approved publisher destination or proof of truth/peer review.
- **BBC World RSS:** current official-feed titles/links, locally matched to the query.
- **ATLAS directory:** twelve explicitly labeled primary documents/source collections. These are curated links, not fabricated articles or a live crawl.
- **Optional Brave web index:** set server-only `BRAVE_SEARCH_API_KEY` for wider approved-domain discovery, including Reuters/AP. This is a search service key; all AI generation remains Mistral-only. Its responses are independently filtered by ATLAS. No claims of complete news coverage are made without this integration.

The UI displays source/category/year filters, the approved directory and selection rationale, origin links, known publication dates, discovery method, retrieval timestamps, provider availability and incomplete coverage notices. Missing dates/authors are not invented. Search counts describe only the retrieved result window; they are not an exhaustive web count. The bounded in-memory metadata cache lasts 60 seconds and holds at most 50 queries. Full documents are not scraped or imported automatically. Optional AI snippet explanation is explicitly separate from search results and does not claim to have read full articles.

Live checks succeeded for World Bank, Crossref and BBC feed adapters. Sample searches returned 28 approved matches for `climate finance` and 7 for `South China Sea arbitration`. Production compilation and 65 checks pass, including hostile-domain/redirect rejection and year/source/category filtering. One live Supabase test remains skipped; optional Brave discovery was not live-tested without its key, and browser visual inspection is unavailable.

API references: [World Bank document search](https://documents.worldbank.org/en/publication/documents-reports/api), [Brave web search](https://api-dashboard.search.brave.com/api-reference/web/search/get), [Brave search operators](https://api-dashboard.search.brave.com/documentation/resources/search-operators).

## Completed Psykie search and unified Library work

The local Psykie project was inspected without changing it: `src/pages/ResearchPage.tsx`, `supabase/functions/_shared/handler.ts`, `supabase/functions/_shared/contracts.ts`, `src/utils/studyLibrary.ts`, and `src/utils/documentFiles.ts`.

### Search now follows Psykie's cited-link flow

With `MISTRAL_API_KEY` configured, ATLAS plans an International Studies query using Mistral Small, calls `/v1/conversations` with `web_search` and `store:false`, extracts **only actual `tool_reference` citations** from that tool, applies ATLAS' approved-source policy, then runs an index-only Mistral relevance pass. The relevance pass cannot introduce a new URL, author, date or DOI. Its cautious summaries/reasons are labeled AI-generated, not verified quotations or full-text summaries. The source directory retains ATLAS' institutions, research publishers and established news sources rather than importing Psykie's psychology-specific source list.

`MISTRAL_SEARCH_MODEL` defaults to `mistral-medium-latest`, matching Psykie's web-search configuration. Query/relevance calls use `MISTRAL_CHAT_MODEL` or `mistral-small-latest`. Broader search no longer requires Brave; its key/client were removed. When no Mistral key is set, the UI explicitly displays direct catalogs/feed mode. When configured Mistral search fails, the endpoint reports that failure rather than silently substituting generated links or another discovery mode.

### One Library for references and uploads

- Search's **Save to Library** action is independent of research projects. Saved indicators recognize normalized URLs and DOI aliases.
- The Library has All / Files / References views, text search, reference favorites/collections, original links, APA copy/export, and optional project association.
- Uploads from the Library, study/practice upload controls and Notepad import are included in the same material collection. They can launch recitation or quiz practice directly.
- Existing project references migrate idempotently into the Library. Project-specific notes, reading state, tags, source IDs and associations remain intact. Removing the standalone reference preserves project copies and records a tombstone so migration does not resurrect it.
- Reference metadata, snippets, AI relevance notes, origin URLs and known retrieval dates are preserved. Unknown dates remain unknown.
- Original uploads are content-addressed with SHA-256 and stored as private, account-scoped IndexedDB blobs; extracted text/metadata remain in the workspace snapshot. Duplicate uploads reuse a stable material ID where possible. Retaining the original must succeed before a new upload is reported saved.
- Original files can be downloaded from their upload device. Legacy materials explicitly say their original was not retained and allow attaching an original while preserving the material ID/study links.
- Removing a Library metadata entry or clearing the workspace does not purge retained binary copies. The UI makes this retention behavior explicit. Original binaries are not included in JSON exports.

### Optional private original-file sync

Apply `migrations/002_library_files.sql` to the configured Supabase project. It creates a **private** `atlas-library-files` bucket and owner-folder policies for insert/read/delete. No public file URL or browser service-role credential is used. New originals upload under the authenticated user's ID when configured; otherwise their device copy remains available. The Library's **Sync original** action retries this separately from text/snapshot sync. Other signed-in devices download and privately cache originals from the bucket. Explicit guest-workspace import copies retained guest originals into the selected account; account switching during import is guarded.

`migrations/001_cloud_workspaces.sql` still manages the metadata snapshot. The new storage migration is separate. Actual Supabase credentials/migrations were not available to apply or live-test here.

### Verification

Production build and TypeScript pass. With the local test server, 79 automated tests passed. The separate original-file RLS test (`tests/cloud-files-rls.test.mjs`) requires `ATLAS_RLS_TEST_FILES=true`, the existing disposable two-account test environment, and migration 002. Both live cloud isolation suites remain skipped without their configuration. Mistral search is tested with a complete mocked planning → actual-tool-citation → relevance fixture, but live tool/model access remains unverified without `MISTRAL_API_KEY`.

Browser/native inspection hosts were unavailable; visual and browser-interaction QA remain outstanding. File retention/account isolation were exercised with an IndexedDB test adapter. Stable workspace serialization was added to prevent key-order differences introduced by migration from blocking autosave.

Mistral reference: [Websearch tool](https://docs.mistral.ai/studio/agents/agent-tools/websearch).

## Functional audit — November 12, 2026

Fixed search pagination using edited but unapplied filters: Previous/Next now retain the submitted query and filter set until another search is submitted.

Fixed AI cancellation races in Study Studio and inline assistance. Switching sessions, closing inline help, or changing its task/content invalidates the request immediately. Late responses cannot replace content or clear a newer request's busy state. Cancelled practice generation and grading also discard late responses. Practice generation excludes trashed notes.

Fixed lesson recitation handoff to include the lesson body. Explicitly seeded study/scenario entry points start in general practice mode so they can begin without an unrelated upload; ordinary new sessions retain material-based practice by default.

Validation: TypeScript and production build passed. Full test suite against the local production server: 83 passed, 2 skipped (live Supabase tests require credentials). Four new React/DOM interaction tests cover stale inline responses, session switching, applied search filters, and late cancelled quiz generation. Live Mistral output remains unverified without a configured key; no visual browser verification was available.

## Folders — November 12, 2026

Library and Projects share saved folders. Create and rename folders inline, filter by All items / Unfiled / a folder, and move references, uploaded materials, and projects through their folder controls. New projects and Library uploads inherit the current folder. Folder deletion keeps all content and unfiles its items across both screens. Library reference export respects the current filter. Empty folders persist in the workspace backup and configured cloud sync. Existing reference collections migrate into folders without changing reference IDs, original files, or project associations.

Folder validation: production build (including TypeScript) passed; 88 tests passed against the local production server, with 2 live Supabase tests skipped. Regression coverage includes folder name validation, safe deletion across files/references/projects, repeatable collection migration, filtering, and React folder creation/rename/delete controls. Live cloud persistence and visual browser layout were not verified.

AI model update: every AI task now uses ministral-8b-latest through the shared AI_MODEL constant, including image transcription/OCR, study feedback, practice generation, search planning, cited web search, and relevance review. Legacy model override environment variables are ignored and removed from .env.example. Removed setup banners from AI Studio and Practice; an unavailable service returns an on-demand user-facing error. Production build/TypeScript passed; 71 tests passed, with 19 live endpoint/cloud tests skipped when no test server was running. Live provider output was not verified without a configured Mistral key.

## Consolidated application and fetched global map - November 13, 2026

Replaced the 17-entry module sidebar with six main areas: Home, Explore, Search, Library, Projects and Practice. Old hash links resolve into the new structure. Removed the static explainer/lesson/scripted-scenario previews, empty country relationship/treaty tabs, and the unused sample-content module. Projects now contain source reading notes, typed/handwritten notebooks, separate policy briefs and citations. Existing legacy drafts migrate without overwriting a saved project draft. Unfiled notes and briefs remain available. Settings adds validated JSON backup restoration with a preview and explicit replacement action; original binaries remain separate.

Explore fetches World Bank country metadata and the latest nonempty observation per country for population, GDP, GDP per capita and GDP growth. The heat map changes with the selected data layer, excludes regional aggregates from country ranks, supports country search/comparison, and displays observation years, source update/fetch times and source links. Refresh, timed/focus refresh, bounded caching, concurrent-request coalescing, explicit stale data and visible retry errors are implemented. ISO identity metadata and reference boundaries remain static assets; statistics and country profile metadata are fetched. Flags cover the expanded country set locally.

Live production endpoints returned 217 country/economy profiles and population observations, with GDP, GDP per capita and growth available for 214 of those profiles. Growth required omitting an explicit upstream source filter that repeatedly timed out; the official indicator's default query returned current values successfully. Production build and TypeScript passed. Full endpoint/unit/DOM suite: 102 passed, 2 live cloud isolation checks skipped. Browser/native inspection hosts were unavailable; no visual browser QA is claimed. See CURRENT_PRODUCT.md for the authoritative current scope and setup.

## Live source map - November 13, 2026

The default Explore view now fetches BBC World and UN News headlines, GDACS disaster alerts and USGS M2.5+ earthquakes. The browser checks feeds every five minutes while visible, on focus, and on manual refresh. Automatic checks share a five-minute server cache; manual refresh can bypass it after a 45-second upstream cooldown. Server fetches use no-store. Provider states and original source/fetch times remain visible; partial failures preserve dated stale reports for at most 24 hours, and missing sources never receive fabricated replacements.

News markers explicitly indicate country names mentioned in feed text using reference coordinates, not confirmed incident locations. Unmapped headlines stay visible. Disaster markers use provider coordinates. Reports can be filtered, inspected and saved to Library. Published World Bank statistics remain available in a separate Explore tab.

The production endpoint returned current reports from all four feeds: 59 news reports and 261 disaster source reports during the check, including overlapping source reports. Counts are not unique-event totals and change over time. Production build/TypeScript passed. Full suite: 109 passed, 2 live cloud isolation tests skipped. Browser visual verification remains unavailable. Current scope and source links are documented in CURRENT_PRODUCT.md.

## Contextual sidebar - November 13, 2026

The six primary sections now expand to expose their existing activities, including live/statistical Explore views, Library file/reference/favorite views, project notes/briefs/citations, and individual practice modes. New project and Upload actions open the actual creation/import interfaces. The sidebar also displays real saved projects and Library folders with counts, plus notebook/import shortcuts. Empty workspaces show an upload prompt rather than sample projects. Settings and sync status stay at the bottom while the navigation scrolls independently.

Hash parameters select the correct content view and preserve browser navigation; folder IDs are encoded. Shortcuts remount their target view so revisiting a shortcut resets it correctly after local tab changes. Build and TypeScript passed. A DOM interaction regression verifies activity, file view, folder, saved-project, create and import destinations. Visual browser inspection remains unavailable.

## Map navigation - November 13, 2026

Live and country-statistics maps share pointer-based drag navigation for mouse, pen and touch. Wheel zoom anchors to the pointer; zoom buttons support 1x-8x. Panning is bounded so the world cannot be moved completely off-screen. Arrow keys pan the focused map, plus/minus zoom, and Home/Reset restore zoom and position. Dragging suppresses the resulting click so reports/countries are not accidentally selected; ordinary taps/clicks still select. Pointer release outside the map and window blur end the gesture. Native wheel listeners are removed on unmount. Production build/TypeScript and map interaction checks passed, including drag, click suppression, wheel zoom and reset.

## Motion, controls and map performance - November 13, 2026

Fixed the map's pointer-move bottleneck: drag input now updates a shared view ref and coalesces SVG transform writes through requestAnimationFrame. React publishes the view only at gesture completion or after a wheel burst, so the country map and report list are not rebuilt for each pointer move. Projection geometry is memoized, and gesture bounds are measured at pointer-down rather than per move. Wheel zoom remains pointer-anchored, zoom/reset buttons ease over 200 ms, and reduced-motion zoom changes are immediate. A profiler regression verifies that 100 pointer moves cause one scheduled frame and zero React commits during dragging.

Downloaded the official free menu-dropdown, modal, toast, panel-reveal and tabs-sliding recipes using the transitions.dev CLI. Upstream recipe references are retained under docs/motion-references/. Adapted tokens, origin-aware open/close motion, soft panel/page entrances, sliding tab indicators, sidebar expansion, restrained button feedback, translucent surfaces and modal/menu/toast backdrop blur are implemented in app/motion.css. Map input is deliberately kept outside decorative transitions and blur effects. New effects honor prefers-reduced-motion.

Replaced native select presentation throughout the app with the shared AppSelect control: theme-aligned trigger and portal menu, keyboard/type-ahead selection, screen-reader labels, disabled options, Escape/outside-click dismissal, viewport-aware positioning, and native form-value compatibility. Dropdown changes preserve rich-text selection and formatting. Hidden native controls retain form semantics; their OS popup is suppressed.

Verification: production build and TypeScript passed; 115 tests passed with 2 live cloud isolation tests skipped. Headless Edge browser checks passed at desktop and 390px mobile widths, including dropdown placement/selection, project creation, rich-text heading formatting, modal/toast exits and reduced motion. A 500-report isolated live-map stress test recorded zero SVG path rewrites and zero long main-thread tasks during the tested drag. Test fixtures exist only in the isolated browser context; production observations and the user's workspace are not seeded or altered. Screenshots in artifacts/ui-smoke/ were visually inspected. Other browsers and physical touch devices remain unverified.

Run browser checks with a local server and npm.cmd run test:browser. ATLAS_TEST_URL defaults to http://localhost:3016; playwright-core uses the installed Edge browser (ATLAS_BROWSER_CHANNEL can override the channel). No browser binary is downloaded into this repository. The browser check also fixed same-page hash navigation retaining a previous Explore view; route-specific component keys now restore the requested subview on URL/back navigation.

## Separate handwritten sheets - November 13, 2026

Moved Add page from the handwriting toolbar to a footer after the final sheet inside the paper scroller. New pages scroll into view and the eight-page limit remains. Pages now render as individual SVG sheets with borders, shadows, page captions and a clear background gap. Each sheet uses an offset viewBox so existing saved global ink coordinates remain valid. Pointer coordinates include the current page offset, and erasing is scoped to the visible sheet. Legacy strokes crossing a boundary remain visible on each relevant sheet. Captured snapshots also fix deferred-state undo/redo history errors.

HTML export now includes every sheet rather than only the first SVG. Print styling separates sheets with page breaks. Production build/TypeScript passed; 116 tests passed with 2 live cloud tests skipped. Regression coverage checks sheet separation, page addition, second-page stroke coordinates and undo/redo. Headless Edge verified visible sheet gaps and a two-page HTML download; the separate-paper screenshot was visually inspected.

# Current ATLAS product

Updated November 15, 2026. This document supersedes the earlier five-pillar preview navigation and SaaS proposals.

## Search provider removal (November 15, 2026)

Mistral is no longer used by ATLAS Search or Relations. Its search adapter, model settings and server-only search key entries were removed. The legacy Gemini grounding adapter was also removed instead of becoming a hidden replacement. Search now uses direct World Bank documents, approved Crossref publisher records, BBC reports and the existing primary-source directory, with optional standard Gemini relevance review. Relations retains Gemini passage-ID assessment. Coverage is narrower than full-web discovery and is labeled accordingly. Earlier provider sections below are historical. France Notes separately uses direct PubMed/NLM search; its general Mistral AI remains unchanged. These are local changes, not a deployment.

## Psykie search and relation evidence repair (November 15, 2026)

Follow-up: the observed provider response was HTTP 429 with `web_search rate limit reached.`, which does not establish exhausted credits. Search now distinguishes confirmed rate throttling, explicit billing/usage limits and ambiguous limit responses. It honors Retry-After when supplied and otherwise uses a one-minute application cooldown rather than immediately resending requests. The fallback cooldown is not a claimed provider reset time. Caches are scoped to a server-only key fingerprint so a rotated key does not inherit another key's cached rejection. Legacy cached quota warnings no longer assert exhausted allowance. Provider organization/workspace limits can still apply after rotation. The news/disaster map is separate: direct BBC, UN, GDACS and USGS feeds now use five-minute periodic checks with manual refresh and upstream request coalescing; no AI search key is used for those feeds.

Search and Relations now use Psykie's Mistral Conversations web-search approach when the server-only search key is configured. The user's supplied key is stored only in ignored local environment configuration. Actual tool citations are filtered against ATLAS's approved sources, then reviewed by candidate index. Failure of optional relevance review preserves actual approved links with a clear notice rather than replacing them with unrelated catalogs.

Live debugging found the assessment model returning the anchor ISO instead of the other party and inserting ellipses into generated quotes. ATLAS now extracts original passages itself and the model selects passage IDs; server-controlled country codes and original wording pass through the existing exact-quote validation. One bounded alternate search excludes publishers when every initial page is unreadable. No rating or source text is fabricated.

Verified with the real configured provider, live API and unmocked browser: Philippines–China Diplomacy returned five readable sources and an assessment with six original-source passages. The restarted development app displayed these passages. This does not establish complete global coverage: live US Security and China Trade attempts also encountered HTTP 403 publisher blocks, truncated optional relevance output and provider search quota responses. The alternate-publisher recovery is regression-tested with fixtures; successful live recovery for those failed cases is not claimed. Production builds pass and client static bundles contain no search key. See AI_SETUP.md for configuration and limits.

## Account screens and motion (November 14, 2026)

Dedicated branded account screens now cover `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/check-email`, `/auth/callback` and `/auth/error`. They include Google OAuth, email/password authentication, email confirmation, recovery/update states, password visibility, validation and safe internal redirects. They use the existing shared Supabase client with PKCE; no fake login is provided when configuration is missing. Settings links to these screens. Browser account initialization is deferred until hydration to keep server and client markup consistent. Guest work remains separate and is imported only through the existing explicit account action.

Unmatched paths show the custom ATLAS 404. Shared motion durations are now 480 ms for page entry, 380 ms for opening, 260 ms for closing and 220 ms for small interactions; component removal timers read the CSS closing duration. Reduced-motion settings are respected, and map interaction stays immediate.

See AUTH_SETUP.md for Supabase URL allowlists, Google provider configuration, email templates and required live account tests. Production build and 158 tests pass with two credential-dependent cloud isolation checks skipped. Sixteen desktop/mobile account/404 views pass automated WCAG AA, overflow, navigation and password visibility checks. Authentication actions and reset/error states are covered using mocked SDK operations. Actual Google/email delivery, production-domain redirects and live cloud isolation remain unverified until the user's backend is configured. Separately observed source-search quotas, publisher blocks and neural speech availability remain release limitations; this is not a declaration of production completion.

## Navigation and content

Six primary areas: Home, Explore, Search, Library, Projects, Practice. Settings is separate. Old hash links resolve to the corresponding consolidated workflow instead of opening a blank screen.

Notes, policy briefs, project sources and APA citations live in Projects. Unfiled notes and a separate unfiled brief are available without a project. Each project owns its own policy brief and evidence links. Legacy workspace-wide drafts migrate to the selected existing project once, or stay unfiled if no project exists. A pre-existing project draft is never overwritten by migration. Deleting a project unfiles its notes and preserves standalone Library entries and original files; the UI confirms deletion of its brief and project-specific source annotations.

Folders are shared across references, uploaded materials and projects. Empty folders persist. Folder deletion moves its items to Unfiled without deleting content.

The former static World Affairs explainers, three introductory lessons, scripted simulations, and empty country Relations/Treaties tabs were removed from the application. Curated trusted-source directory links remain as real source references, not fabricated articles. Identity codes and Natural Earth boundaries are reference assets, not live observations.

## Live map (default)

Explore opens on fetched news and disaster reports. GET /api/live-map reads BBC World RSS, UN News RSS, the official GDACS disaster feed, and USGS M2.5+ earthquakes from the last 24 hours. No API key is required for these feeds. All report text, alert values, source times and disaster coordinates come from live upstream responses. The approved-source policy includes official GDACS and USGS domains. News links must pass the same policy.

The browser polls every 60 seconds while the page is visible and checks on focus/visibility return. A refresh control is available. The server coalesces requests and caches a feed check for 45 seconds. This is near-real-time source polling; delivery depends on the publisher, network and publication cadence, rather than instantaneous event detection.

Each provider has its own status, last successful fetch and available source-feed timestamp. Partial failures leave working sources available. Older successful reports are explicitly marked stale and retain original fetch times; stale cached reports expire after 24 hours. There are no sample reports substituted when sources fail. Feed checks do not manufacture source publication times.

GDACS and USGS markers use coordinates supplied by those providers. BBC/UN feeds do not supply incident coordinates: news markers use exact country-name/alias matches in source headline/description text and reference country coordinates. The UI labels these as country mentions, not confirmed incident locations. Unmatched headlines stay in the list. Ambiguous mentions require reading the original report. Markers group source reports at the same coordinate; overlapping GDACS and USGS reports are not claimed to be unique incidents.

Users can filter news/disasters, inspect individual reports, open source pages and save references to Library. Report timestamps and source metadata remain attached. Static source configuration, ISO reference geography and map boundaries are distinct from fetched observations. No generated event headlines, magnitudes, alert levels or timestamps are seeded into the map.

Live production verification on November 13, 2026 (Asia/Manila) returned 29 BBC headlines, 30 UN headlines, 226 current GDACS reports and 35 USGS earthquake reports; counts will change. All four providers reported successful fetches. Seven new regression tests cover source filtering, location validation, timestamps, polling, Library saves, partial outages and stale-data expiry.

Sources: [BBC World feed](https://feeds.bbci.co.uk/news/world/rss.xml), [UN News feed](https://news.un.org/feed/subscribe/en/news/all/rss.xml), [GDACS overview and RSS reuse](https://www.gdacs.org/About/overview.aspx), [USGS feed format](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php). GDACS attribution: European Union / GDACS, CC BY 4.0. Automated estimates and alerts may be revised.

## Published country statistics (secondary view)

`GET /api/intelligence?indicator=population` fetches the World Bank country directory and the selected World Development Indicators series. Available layers: population (`SP.POP.TOTL`), GDP (`NY.GDP.MKTP.CD`), GDP per capita (`NY.GDP.PCAP.CD`), and GDP growth (`NY.GDP.MKTP.KD.ZG`).

Requests use `mrnev=1` to fetch the most recent nonempty observation per country. No year or value is invented. Population/GDP are periodic statistics, not real-time geopolitical intelligence. Country metadata, source update dates, fetch times, observation years and source links are visible. Countries can report different years; gray map regions have no matching observation. Regional aggregates are excluded from country profiles and map color rankings. Color represents relative rank among covered countries, rather than equal numeric intervals.

The server cache lasts one hour and coalesces concurrent requests. Refresh bypasses a valid cached entry after a 60-second minimum interval. A failed refresh can serve a previously successful snapshot with an explicit stale warning and its original fetch date. With no usable snapshot, the UI shows an error and Retry. The open Explore view refreshes every 15 minutes and on window focus. Source changes remain subject to upstream publication schedules and the refresh interval.

Country identities join map boundaries by numeric ISO codes using `world-countries`; observations join by World Bank ISO3 codes. Country names, capitals, regions and income groups are fetched from the World Bank. The World Bank describes countries/economies; map boundaries do not assert sovereignty. Flag SVGs are stored locally in `public/flags/`.

Reference: [World Bank API query parameters](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures).

## AI and voice

Text AI now uses server-side Groq `openai/gpt-oss-120b` with `GROQ_API_KEY`. Image transcription uses Mistral `ministral-8b-latest` with `MISTRAL_API_KEY`. Search uses direct catalogs/feeds with optional AI relevance review; paid search grounding is disabled. See AI_SETUP.md for the current configuration.

Read-aloud retains the France Notes-style Edge neural voices and chunked playback implementation. Speech setup remains separate from the AI model.

## Setup and persistence

Install dependencies, run `npm.cmd run dev`, and configure `.env.local` using `.env.example`. Node.js 22.18+ is recommended.

Guest work is stored on the device. Optional Supabase account sync requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and [migration 001](../migrations/001_cloud_workspaces.sql). Private original-file sync additionally requires [migration 002](../migrations/002_library_files.sql). Never use a service-role key in browser configuration. Enable email/password authentication and configure allowed redirects in the Supabase project.

`QUIZ_SIGNING_SECRET` is an optional stable server secret for grading saved quizzes across server restarts. Keep it private.

Workspace exports include metadata, folders, project briefs, notes, practice and extracted text. Settings can restore valid legacy or current JSON backups after a preview and an explicit replacement action. Restore replaces the active workspace and can sync to the signed-in account. Original binaries are not included; retained device/cloud copies must remain available. Export the current workspace before restoring another copy.

## Verification limits

Live requests through the production app succeeded for all four map layers. The directory and population cover 217 countries/economies; GDP, GDP per capita and growth currently contain observations for 214 of them. The Philippine observations are dated 2025, and the source update date is November 11, 2026. The production build and TypeScript checks pass. With the production server running, 115 tests passed and 2 live Supabase isolation tests were skipped. Automated checks cover data normalization/cache behavior, map interactions and failures, navigation aliases, backup preview/confirmation and migration, and project brief isolation.

Live AI output and cloud isolation require configured credentials. Headless Edge desktop/mobile visual and interaction checks now pass, including menus, formatting, overlays and map dragging; other browser engines remain unverified. This implementation does not claim complete current-news coverage, automatic full-text acquisition, verified geopolitical relationships, or editorial review of generated text.

## Sidebar organization

Primary sections expand into their existing views and activities. Saved projects and Library folders appear as shortcuts from actual workspace data. New project, import and notebook actions open their corresponding interfaces; empty workspaces offer an upload prompt. Settings and current sync status remain anchored at the bottom. This adds context to navigation while preserving the six-area product structure.

## Motion and themed controls

The motion system adapts the free [transitions.dev recipes](https://transitions.dev/) preserved in [motion-references](motion-references/). Menus, dialogs, toasts, panels, page entrances and sliding tabs share timing/easing tokens. Small overlay surfaces use restrained blur and translucent backgrounds. Reduced-motion settings remove decorative motion and blur transitions.

AppSelect presents the same themed dropdown across the app, with keyboard/type-ahead operation, labels, disabled states and viewport-aware menus while retaining native form values. Map dragging uses frame-coalesced direct transform updates and memoized country paths instead of React state updates on every pointer movement. Buttons ease zoom/reset; direct dragging follows the pointer.

Headless Edge checks now cover desktop/mobile dropdowns, formatting, modal/toast exits and reduced motion. An isolated 500-report drag test recorded no path rewrites or long main-thread tasks. Browser fixtures and screenshots are test artifacts, not production observations. Current validation: production build/TypeScript and 115 automated tests passed; 2 live cloud isolation tests remain skipped. Other browser engines and physical touch devices have not been verified.

## Handwritten pages

Handwritten notes use separate bordered sheets with shadows, numbered captions and visible gaps. Add page is below the last sheet in the paper scroller; new sheets scroll into view. Existing ink coordinates are preserved across the layout change, including legacy strokes crossing boundaries. HTML export includes all sheets and printing uses separate page breaks. The eight-page limit remains.

## Quiz sources (November 13, 2026)

Quizzes and flashcards offer My PDFs & notes and General IS subjects. Uploads support PDF, DOCX, PPTX, text and images through the existing extraction/review/Library flow. General practice requires no upload and covers eight starter subject groups with optional FEU or UE curriculum guides. These are independent practice questions, not official school exams or complete syllabi.

Curriculum metadata references FEU Area Studies effective SY 2024–2025 and UE listing AABIS2023. Fixed approved UN, WTO, Supreme Court E-Library and E-International Relations readings are fetched on the server (one-hour cache), with validated redirects and visible failures. Generated questions must quote retrieved excerpts. Saved sets retain reading URLs, fetch dates and partial-source warnings; grading reveals supporting links. Upload the actual course syllabus/readings for instructor-specific coverage.

Validation: production build, request/source/citation unit tests and the general-subject generation UI workflow pass. Actual model generation requires the configured API key and was not exercised live during this change.

## Report thumbnails and shared visual scale (November 13, 2026)

Live news preserves RSS media thumbnails, image enclosures and grouped image metadata. Only HTTPS approved publisher/media destinations are accepted. Cards and selected-report details show publisher images; missing or failed images show an explicit news/alert tile. No invented event photography is used. Current BBC feed verification returned 31 images for 31 reports.

Shared workspace rules standardize panel radii, padding, content alignment, heading/meta scales and action heights across study, projects, Library, Search, Home and Explore. Report rows use a fixed thumbnail column and left-aligned text with a compact mobile layout. Validation: production build; 122 tests pass, two credential-dependent tests skipped; desktop/mobile browser smoke, 500-report map performance, thumbnail loading/failure fallback and PDF/general-quiz browser checks pass.

### Visual preference correction

The later broad workspace style overrides were removed to preserve the previous appearance. Thumbnail rendering and the report-specific alignment fix remain. Quiz setup no longer repeats curriculum-reference links already available through the selected curriculum guide, and its introductory notice omits the repeated source-selection explanation. TypeScript and all ten UI workflow tests pass after this adjustment.

## Country relations map (November 14, 2026)

Explore now includes Relations beside live reports and published statistics. A country profile in statistics can open View relations using that country as the viewpoint. The existing map navigation, controls, country-panel styling and flags are retained. Select another country to inspect bilateral evidence; View from changes the viewpoint. Diplomacy, Security and Trade are separate lenses. Evidence and Treaties share the side panel rather than adding a second country Relations tab.

The server uses the configured shared AI model and web-search tool to discover approved citations, fetches up to eight readable original pages with revalidated redirects, and extracts evidence from those texts. Every displayed pair requires a continuous source quote naming both countries. Treaty names must occur in their supporting quote. No numeric friendship scores or hardcoded relationships are supplied. Color labels describe reported cooperation, tensions or both; gray means insufficient retrieved evidence. Summaries are clearly labeled AI interpretations and are not independent verification. Treaty mentions do not establish legal status or exhaustive coverage.

Original source publication metadata (when available) and retrieval dates remain separate. Evidence references can be saved to Library. Results cache for one hour with manual refresh, a one-minute cooldown, request coalescing and bounded concurrency. Source/service failures show an error or an explicit incomplete result, not invented links or neutral ratings. No database migration is needed.

Validation: production build; 127 tests pass with two credential-dependent tests skipped; dedicated desktop/mobile browser workflow covers map selection, bilateral evidence, treaty passages, source saving, dimension selection, insufficient evidence and failed refresh. General browser smoke and PDF/general quiz smoke also pass. Provider and page responses are mocked in the research unit test and isolated browser workflow. Live relationship research was not run without a configured API key.

## PowerPoint export (November 14, 2026)

Practice offers Create presentation after selecting readable files or a saved note. This reuses source-only reviewer generation and the configured shared AI model, requesting slide headings, concise bullets, speaker notes and source labels. Responses remain saved in the existing conversation workspace and can be reviewed before export. Download PowerPoint is available on assistant responses and creates an editable widescreen PPTX locally with the ATLAS palette, text shapes, notes pages and a study-materials section. No new database migration or separate presentation page is required. Original selected files remain in Library; PPTX files are downloaded, not automatically uploaded to cloud storage.

The exporter uses pptxgenjs, loaded on demand. Long responses are split into bounded slide bodies. Explicit Speaker notes: paragraphs go to notes rather than visible slide content. Other responses can also be exported as simple text presentations. This is a study-deck workflow, not a visual chart/image generator or a slide editor inside ATLAS.

Validation: production build, TypeScript, 130 passing tests with two cloud isolation tests skipped, and an isolated browser upload → AI-request fixture → actual PPTX-download workflow. Package tests inspect editable slide text, speaker notes, source filenames and XML validity. PowerPoint rendering and live model output remain unverified. France Notes code was inspected read-only; this does not establish usability parity without user testing.

## UI/UX audit (November 14, 2026)

See UI_UX_AUDIT.md for the full review against France Notes. Changes preserve the established design: direct Home upload/project actions, fewer duplicate/empty panels, progressive disclosure for file maintenance/privacy, readable safe AI Markdown (including tables), real Library text previews, activity guidance, suggested-topic search, filter reset, mobile keyboard exclusion/skip navigation and improved dark-theme text contrast. Final production build passes. 133 tests pass; two live cloud tests remain skipped. The 50-view desktop/mobile, empty/populated, light/dark audit reports zero automated accessibility violations, overflows or browser errors. Separate upload/PDF/quiz/presentation/relations/note/map browser workflows pass with isolated provider fixtures. Real-user usability parity and live service/device behavior remain unverified.

## AI provider change (November 14, 2026)

The active provider is now Google Gemini, fixed to gemini-3.5-flash-lite for all text and image tasks. GEMINI_API_KEY replaces MISTRAL_API_KEY; an empty server-only entry was added to .env.local without altering other configuration. See AI_SETUP.md. The previous Mistral web-search implementation was removed. Existing saved outputs retain their original metadata.

OCR uses inline image data; quizzes retain exact-source-quote checks and encrypted grading tokens. Rate-limit, authorization, safety-blocked and incomplete outputs are explicit failures. No provider fallback, model upgrade, Google Search/Maps grounding or other paid tool is enabled. Free-tier quotas are project-dependent; a billing-enabled project can incur token charges under its account settings.

Search now uses the existing real catalogs/feeds and optional Gemini relevance selection by supplied record index only. Relations discovers country-specific records from those sources, reads approved original pages, and extracts quote-supported pairs. This is narrower than full-web discovery and the UI discloses limited coverage. Edge neural TTS, uploads, local text extraction and Supabase sync are unchanged.

Validation covers the Gemini request adapter, image encoding, JSON mode, provider error states, direct-source relevance, and route-level OCR/quiz integration using mocked provider responses. Production build and browser upload/quiz/presentation/relations workflows pass. No real Google API key was available for a live model/eligibility/quota test.

## France Notes-style search and AI Chat (November 14, 2026)

Source inspection confirmed France Notes uses gemini-2.5-flash with Google Search grounding. Its listed free allowance differs from 3.5 Flash-Lite. ATLAS now uses that legacy grounding path for Search while available, accepts only real grounding chunks, resolves exact Google redirect hosts to approved destinations, and displays provider search attribution in a sandboxed frame. It does not copy France Notes' generated-reference JSON fallback. Grounding failures use visibly labeled direct catalogs/feeds. A hard cutoff at December 1, 2026 disables legacy grounding before the provider's announced automatic migration; it does not automatically switch to a paid search model. ENABLE_GOOGLE_SEARCH_GROUNDING=false can disable it earlier. All general AI and OCR remain on gemini-3.5-flash-lite.

AI Chat is a separate sidebar destination with ordinary multi-turn messages, saved/renamable/deletable conversations, file/note attachments, explicit stop/retry, safe formatted replies, copy, read-aloud, save-as-note and a Search sources shortcut. Chat sessions use task chat in the existing account-scoped snapshot; Practice filters them out and labels its tutor Guided study. No Supabase migration is required. Recent turns and selected document excerpts provide context; Chat itself does not pretend to have live web access. Toast centering was corrected so chat save notifications stay on screen on mobile.

Validation: production build; 140 tests pass, two live cloud tests skipped; dedicated browser checks cover chat attachment/extraction, follow-ups, rename/persistence, note saving, separation from Practice, source search, sandboxed attribution and desktop/mobile accessibility. Actual provider eligibility, billing settings, quota and live search/model quality still require the configured project's key.

## Relations retrieval repair (November 14, 2026)

The Relations map now uses actual cited web search when available, with labeled direct-catalog fallback. Selecting a second country sends a targeted bilateral request, and the API validates/caches each country pair separately. Failed/empty results have a shorter cache; refreshing an empty assessment can retry immediately. Previously retrieved pairs remain on the map, while a refreshed selected pair is replaced by its newly supported result rather than retaining an unverified old rating.

Original pages supply their actual HTML titles where available. Relevant excerpts are retrieved across each text rather than taking only its beginning. The existing exact-quote, country-name and treaty-name checks remain. PH DFA/PCO, China MFA and US State Department were added to the approved institutional source list. No relationship values or claims are hardcoded.

All discovered source links remain visible and saveable even when page retrieval or AI assessment fails. Reading failures and discovery limitations appear above the map; source cards distinguish retrieved text from links requiring manual reading. Refresh errors label retained older results.

A real Philippines–China diplomacy request using ATLAS's configured key returned one cited, readable China MFA source and one quote-supported tensions assessment. Provider content is evidence of the publisher's reported position, not an independent diplomatic rating. Production build, 141 passing tests (two cloud tests skipped) and dedicated desktop/mobile browser checks cover target requests, displayed assessment, blocked-source links, saving, dimensions and failed refresh.

## Live workflow audit follow-up (November 14, 2026)

The user reported usefulness problems beyond Relations. Live checks used ATLAS's configured key rather than provider fixtures: Chat and reviewer returned text, Search returned a cited source, but a readable short document failed quiz generation. The initial quiz call returned a generic 502; a second trace showed the model declaring insufficient material despite enough recall facts. A simpler source-based prompt generated a correct structured set.

Practice now uses a dedicated source-based generation helper with explicit field/label rules and at most one correction attempt after invalid structure, insufficient draft or failed source validation. Provider authorization/quota failures are not repeatedly retried. Exact supporting quotes, item counts, unique answers and encrypted grading remain enforced. Persistent validation failure returns 422 and saves no set. A live rerun with the same test reading produced three validated questions. Chat instructions were also clarified to answer directly and respect brief requests.

These findings establish specific live behavior, not that every workflow is useful or all user-reported issues are resolved.

### Browser request and Library workflow repair

Relations dimension follow-up: a live search-provider response reported the free daily request quota exhausted. Search failures now retain an explicit unavailable state instead of presenting them as a lack of bilateral evidence. Security, Trade and Diplomacy use separate topic-specific retrieval queries. Direct-catalog fallback candidates must mention both selected countries, preventing an unrelated Philippines–China record from being used for Philippines–Russia. Exact source-quote validation remains unchanged. Added regression coverage for quota handling, pair filtering and dimension-specific queries; usable live results still depend on provider quota and readable approved sources.

Real browser testing exposed a shared origin-validation bug: Next's internal bind address differed from the public browser origin. Chat, OCR, practice generation, source reading and speech now validate against the request's public Host and protocol using one helper, while rejecting foreign origins. Regression tests use a public Origin with an internal request URL; command-line checks without Origin had missed this failure.

Library now offers Summarize and Make reviewer directly for readable materials. Saved references offer Read & summarize, which retrieves approved original page text before generating a source-only summary and saves that reading as a study material. Blocked or unreadable pages show an actionable error rather than using the search snippet as the original text. Automatic generation is consumed once, including under React Strict Mode.

An isolated real browser run with the configured provider passed uploaded text → summary, uploaded text → reviewer, and saved UN Charter reference → original text → summary, with no browser errors. A browser-origin quiz request also returned three validated questions. The live workflow script uses fresh guest storage and does not modify the user's workspace. Neural speech passes origin validation but Microsoft closed the synthesis stream before completion during live checks; this remains a provider availability limitation and is not reported as successful audio. Cloud account isolation still requires separate configured credentials.


## Current AI providers (November 15, 2026)

This supersedes the earlier Gemini and legacy grounding notes above. Text tasks, structured practice generation, relevance review and relationship passage interpretation use Groq openai/gpt-oss-120b. Image transcription uses ministral-8b-latest with the separate server-side Mistral key. Both providers passed a live synthetic check; the OCR output matched the image text. Search continues using approved direct catalogs and feeds. Build passes; 157 tests pass and two cloud credential checks remain skipped. See AI_SETUP.md.

## GPT-OSS grounded search (November 15, 2026)

Grounded discovery now uses Groq openai/gpt-oss-120b with its browser-search tool. Only executed-tool records on approved domains are accepted. Browser-open excerpts retain their provenance and can support quoted relationship evidence. Direct official APIs and catalogs remain available when grounded discovery is limited. This supersedes the earlier direct-only search notes. Grounding passed a live check; a subsequent evidence assessment encountered provider throttling. Redundant relevance calls were removed and assessment input/output budgets reduced.


## Qwen assessment routing (November 15, 2026)

Text AI and source assessment now use qwen/qwen3.8-27b with reasoning disabled. Browser-grounded discovery remains openai/gpt-oss-120b because Groq rejects browser_search for Qwen. OCR stays Ministral. A live Philippines-wide diplomacy check completed in 11 seconds with 12 pages read and one supported country pair, with HTTP 200 for both model calls. This does not establish complete country coverage or eliminate provider quotas.


## Supabase schema and authentication emails (November 15, 2026)

The root schema.sql now matches active account snapshot synchronization and private original-file storage. It is equivalent to the two rerunnable migrations. Old proposal tables are not dropped from existing installations. PostgreSQL tests verify installation/reruns, owner isolation, revision conflicts, JSON limits, private file rules and protection against old broad policies. Eight branded Supabase email templates, subject mappings and a standalone preview are in supabase/email-templates. See SUPABASE_SETUP.md for deployment steps and the distinction between prepared templates and exposed auth flows. Browser previews and the build pass; hosted Auth, email delivery and storage API tests still need a configured project.

## Required sign-in (November 15, 2026)

The guest-entry behavior is removed. Root requests require server-verified Supabase cookie sessions and redirect to login otherwise. Each app API handler independently verifies the user before running; UI-only hiding is not used as authorization. A client guard keeps the workspace unmounted until a session exists and redirects immediately on sign-out. Authentication, Google callback, signup and recovery pages remain public. Cookies use the official Supabase SSR adapter; older localStorage-only logins may need a fresh sign-in. Existing account and device backups remain intact. Business API/browser integration checks now require a disposable account cookie; anonymous-boundary checks run separately.

## Current OCR routing ? November 18, 2026

This supersedes the OCR provider notes above: images and scanned PDF pages now use Gemini gemini-3.5-flash-lite with GEMINI_API_KEY in Supabase Edge secrets. Text tasks remain on Groq Qwen and grounded discovery on GPT-OSS 120B. Existing deployments must redeploy atlas-ai and the app; no database migration is needed. See AI_SETUP.md and EDGE_AI_SETUP.md.

## Dedicated study workflows - November 18, 2026

Library quiz, flashcard, summary, reviewer, presentation and recitation actions now use explicit practice destinations rather than a generic study fallback. Quiz and flashcard builders show only their own saved set types. Practice navigation persists a dedicated activity route.

Summaries, reviewers, slides, scenarios and research guides render as generated documents without a chat response composer. Guided study, recitation and diplomacy/MUN retain interactive turns. Each activity has scoped saved history; AI Chat remains a separate page with chat-only sessions. Existing transcripts and quiz results are preserved. New document sessions store an optional activity label; old summary/slide titles are recognized for continuity. No database migration or AI Edge Function change is required.


## Ministral text routing (November 18, 2026)

Text generation and structured evidence assessment now use Mistral `ministral-8b-latest` with server-only `MISTRAL_API_KEY`. Groq GPT-OSS browser search and Gemini OCR retain their separate keys and models. Deploy both the app and updated `atlas-ai` Edge Function, adding the Mistral secret in Supabase. A direct live three-question quiz passed source-quote validation; this does not guarantee capacity for all workloads.


## Ministral OCR and quiz correction (November 18, 2026)

OCR now uses Ministral `ministral-8b-latest` through chat completions with embedded image data and `MISTRAL_API_KEY`, in both direct and Edge modes. Gemini is no longer used for OCR. Quiz correction includes the failed draft and explicit field lengths while retaining exact supporting quote validation. Redeploy the app and updated `atlas-ai` function.

# UI/UX audit — November 14, 2026

The audit uses France Notes' StudyBox and navigation implementation as a reference for clear material names, readable previews, nearby study actions, progressive disclosure and plain language. ATLAS keeps its existing visual design. This is an implementation and browser audit, not evidence that both apps are equally easy for the intended user.

## Scope and fixes

| Area | Finding | Change or retained behavior |
| --- | --- | --- |
| Home | Upload and project actions required another navigation step. | Upload opens file import directly; Create a project opens its form. Removed the duplicate empty-state upload action. |
| Navigation | Hidden mobile sidebar links could remain keyboard reachable. | Closed mobile navigation is inert and hidden from assistive technology. Added navigation expansion state and a keyboard skip-to-content link. |
| Library | A redundant unfiled-notes shortcut competed with Library tasks. File cards showed too many operations. | Removed the duplicate shortcut; kept study, quiz and text review visible. Download, storage maintenance and removal are under More actions. Real extracted-text previews help identify files. |
| Library filtering | Empty filtered views lacked a direct reset. | Clear filters restores all folders, favorites and query filters. Current tab retains its meaning. |
| Uploads | Limits and the extraction/save sequence were easy to miss. Storage details dominated the main path. | Immediate supported-type/size validation; concise sequence and batch/page limits; expandable storage/privacy information; saved-and-selected confirmation. OCR still requires an explicit extraction action. |
| Study setup | Empty history panels wasted space. Activity names alone did not explain their results. | Empty history panels are omitted. Each selected activity has a short explanation. Missing-material guidance explains disabled actions. Shortened the mobile study tab label. |
| AI output | Markdown headings, lists and emphasis appeared as raw syntax. | Safe React rendering for headings, lists, emphasis, links, quotes and code. Embedded HTML remains inert. Long automatic presentation instructions display a concise user request. |
| Quizzes | Two distinct source paths need to remain understandable. | Own files/notes and General IS subjects remain separate. Existing source selection, answer feedback, citations, retries and saved practice remain. Empty history no longer occupies a separate panel. |
| Presentations | A separate page would repeat source selection. | Presentation creation stays beside study actions; output can be reviewed and downloaded from the same response. |
| Search | Suggested topics only filled the field and required another action. | Selecting a suggestion runs that search. Existing applied-filter pagination, retry, no-results guidance and source disclosure remain. |
| Projects and notes | Project-specific state and deletion must remain understandable. | Existing unfiled notes, project tabs, confirmations, trash/restore, note formatting, print/export and project separation retained and regression-tested. |
| Explore | Unknown relations or missing observations must not appear as real measurements. | Existing source dates, gray insufficient-evidence states, refresh errors, dimension controls and bilateral source links retained. Map pan and zoom remain responsive. |
| Settings | Speech copy described internal implementation. | Replaced it with voice-selection guidance. Backup preview/restore, clear-workspace confirmation, local/cloud status and voice previews remain. |
| Dark appearance | Active tabs and folder labels failed text contrast checks. | Increased the dark accent's contrast while preserving readable white-on-blue primary actions. |

## Verification

- Automated accessibility/layout audit: 50 route/state/viewport combinations, including 13 empty routes at desktop and mobile sizes and six populated routes in light/dark appearance at both sizes. Final run: zero detected WCAG A/AA violations, horizontal overflows or browser errors.
- Results: `artifacts/ux-audit/results.json`; screenshots in `artifacts/ux-audit/`. Reproduce with a local production server on port 3016 and `npm run test:ux`.
- Main screens: Home, live map, Relations, country statistics, Search, Library, Projects, Notes, policy brief, citations, study, quizzes and Settings.
- Interaction checks: upload/extraction/review/save, actual PDF extraction, general quiz setup, editable PPTX download, relations/treaties/source saving, rich note formatting, separate handwritten pages/export, themed dropdowns, reduced motion, modal/toast exit and map dragging with 500 reports.
- New regression coverage: readable safe AI output, immediate suggested search, and closed mobile sidebar keyboard exclusion. Production build and TypeScript pass.

## Remaining validation limits

Automated accessibility checks do not replace screen-reader use, cognitive-accessibility review, or testing with the intended student. Source fetching and provider responses use isolated browser fixtures in interaction tests. Live AI quality, speech on physical iPhone/iPad, Supabase account recovery, cloud conflicts and original-file sync still require configured services and real-device testing. PowerPoint package structure is tested; visual rendering in PowerPoint remains unverified. AI-generated text does not become verified evidence merely because it is formatted clearly.

A short student session should confirm she can upload a reading, find it again, generate a reviewer and quiz, download slides, recover a note and export a backup without guidance. No claim of France Notes usability parity is made before that observation.

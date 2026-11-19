# ATLAS AI setup

ATLAS adapts the France Notes study workflows to International Studies. It uses the same Ministral primary model and Gemini fallback pattern. Provider keys, account tiers and remaining allowances are separate from the implementation: using the same model does not guarantee the same capacity.

## Provider routing

| Feature | Primary | Recovery |
| --- | --- | --- |
| Chat, guided study, recitation, diplomatic simulations | Mistral ministral-8b-latest | Gemini gemini-2.5-flash-lite when configured |
| Summaries, reviewers, presentations, audio review scripts | Mistral ministral-8b-latest | Gemini with the same supplied context |
| Quizzes and flashcards | Mistral, five items per request | Gemini, then bounded correction of invalid output |
| Printed English images and scanned PDF pages | On-device Tesseract.js | Review low-confidence text; select AI explicitly when needed |
| Handwriting / complex layouts (AI selected) | Ministral vision | Gemini vision, followed by bounded cooldown handling |
| Grounded source discovery | Gemini Google Search grounding when configured | Groq browser search when configured; approved direct catalogs remain available |
| Spoken playback | Microsoft neural speech | Clearly labelled browser voice fallback |

Text fallback handles unavailable providers and throttles. Authentication and input checks still run before any provider call. Saved AI messages record the provider/model actually used. No response is replaced with a fabricated success.

## Hosted deployment

1. In Supabase Edge Function secrets set MISTRAL_API_KEY and GEMINI_API_KEY. GROQ_API_KEY is optional for browser search recovery. These are private server secrets.
2. Replace and deploy the complete supabase/functions/atlas-ai/index.ts file. Follow [EDGE_AI_SETUP.md](EDGE_AI_SETUP.md) for the gateway JWT setting; the handler verifies registered accounts itself.
3. Deploy the app. Deploying the app alone does not update Supabase function code or its secrets.
4. QUIZ_SIGNING_SECRET is optional for legacy encrypted answer-key compatibility. Current quiz generation and AI grading work without it. If already configured, retain its value to keep legacy tokens readable.

For local direct mode, set ATLAS_AI_BACKEND=direct and the same provider keys in .env.local. Provider keys are never browser environment variables. Existing France Notes credentials are not copied or changed automatically.

## Study flow

Adding a file reads, saves and selects it. Text PDFs, Word and PowerPoint use local extraction. Printed scans use local Tesseract OCR by default. Handwriting and complex layouts have an explicit AI transcription option. Originals remain private on the device with optional cloud sync. Review/correction is available beside each saved material.

PDFs support up to 50 pages. Successful page transcriptions are cached in IndexedDB under the active account, OCR mode and file hash. Reimporting the same PDF reuses completed pages. Failed pages remain identified; they are not represented by generated filler. A limit on one page no longer suppresses every later scan. Cooldowns are bounded and cancellation interrupts waits.

Quizzes and flashcards support 5, 10, 20, 30, 50 or 100 items. Each batch contains at most five. Completed batches are saved immediately, and an interrupted set offers Continue generating. AI grading also runs in five-question batches, saves partial assessments, and resumes after interruption. Saved resume metadata references existing materials without duplicating their text. The study interface assembles public question batches directly and sends the saved questions to AI for assessment. It does not need an encrypted answer-key token to generate, combine, or grade a set. Legacy token-based API operations remain available for older clients. Duplicate prompts are rejected.

Mistral quiz requests use an enforced JSON schema, including an enum of valid evidence IDs. The model selects a supplied passage ID. ATLAS attaches the exact supporting source text itself and validates it. This avoids asking the model to recopy punctuation perfectly while retaining source checks. Selecting a passage is not an independent guarantee that every AI explanation is correct.

Audio reviews produce a saved Host/Partner dialogue from selected readings, with alternating voices, pause/stop controls and a transcript. Reviewer and presentation screens remain documents; interactive practice screens retain their conversation flow.

## PDF assets and verification

The importer configures /pdfjs/wasm/, /pdfjs/cmaps/ and /pdfjs/standard_fonts/. scripts/setup-pdf-worker.mjs copies assets matching the installed PDF.js version during postinstall, including scanned-image decoders. Include these generated assets in deployment.

Run npm test, npm run typecheck and npm run build. Browser checks use isolated fixtures and do not write hosted workspaces. A 100-question orchestration test verifies 20 sequential requests, saved progress and protected batch combination; it is not a promise that any short reading supports 100 distinct questions.

## Verification of this update

The local regression suite passed 222 tests (23 environment-dependent tests skipped), and the production build completed. An isolated desktop/mobile browser check verified automatic upload, saved selection, quiz generation and question navigation. A generated 15-page scanned PDF completed live transcription through provider cooldowns without missing pages. A separate live reimport check used the cached text with no second OCR request. Two live five-question batches passed source validation with the enforced schema. Gemini recovery is covered with controlled provider fixtures; it was not tested with a live ATLAS Gemini key because that local key is not configured. These checks do not certify every uploaded file or promise unlimited provider capacity.

## On-device printed OCR

Tesseract.js is the default for printed English scans. It reuses one Web Worker per import and keeps all page recognition local. The app serves its worker, LSTM WebAssembly variants and English language data from /ocr/; scripts/setup-assets.mjs copies these from locked npm packages during postinstall. No CDN or AI key is needed to recognize printed text. Initial loading still downloads these app assets; later asset caching depends on the browser.

The importer renders scanned PDF pages to a 2,600-pixel long edge, then runs local OCR. Tesseract confidence below 65 produces a review warning; confidence is not a measured accuracy percentage. For handwriting, select the AI mode explicitly. There is no automatic AI call when local OCR is empty or uncertain.

Run node tests/browser/local-ocr-smoke.mjs for a self-contained browser benchmark. On the development machine, 15 generated printed-English pages (660 reference words, including three with smaller text, reduced contrast and slight rotation) completed in 19.6 seconds with zero normalized word errors, one worker, zero external requests and zero AI calls. Reimport matched the cached text. This is a synthetic baseline, not a quality estimate for arbitrary PDFs, tables, other languages or handwriting. Full reports are written under artifacts/local-ocr.

## AI grading and older quizzes

Submit answers sends the actual saved questions/options and relevant source material to the AI in batches of up to five. Student selections are withheld from the model while it identifies the best answer; the server then compares those answers with the student's selections. Scores and explanations are labelled AI assessment, rather than the recovered original answer key.

This works for saved quizzes whose encrypted token is missing, expired, or cannot be decrypted. QUIZ_SIGNING_SECRET is not required for this path. If original material is missing, the assessment is labelled as using general subject knowledge. If supplied readings do not establish an answer, the item is unscored and marked for review; the system does not fabricate a grade to fill the gap.

Each completed grading batch is saved in the workspace. Provider cooldowns are handled with bounded waits, and Pause grading interrupts requests and waits. Submitting again resumes from completed assessments. The account authorization boundary is unchanged.

Earlier releases used a temporary encryption key when no stable quiz secret was configured. That could make the original answer key unreadable after a restart. AI grading reassesses the questions rather than claiming to recover that lost key.

## Already-open browser compatibility

Older browser sessions may still submit only an encrypted token and answers. If that token cannot be opened, the server reads the verified account's own workspace using its existing user JWT and owner-only RLS, finds the saved question set by exact token match, and assesses those saved questions with AI. No service-role key, signing secret or database migration is needed. Notes are converted to plain text in the server runtime. Completed compatibility assessments are cached briefly per account and question/source/answer fingerprint to avoid repeating AI work on a retry. If the quiz was never synced, the response requests a refresh so the current client can send its locally saved questions directly; it does not request regeneration.

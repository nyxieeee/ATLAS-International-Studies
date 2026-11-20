# ATLAS

A personal International Studies workspace. No subscriptions, billing, or paid feature gates.

## Run locally

Use Node.js 22.18 or later.

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. For a production build, run `npm.cmd run build` and `npm.cmd start`.

During `npm run dev`, open `/login` and choose **Student demo** or **Researcher demo**. Direct links: http://localhost:3000/dev-demo?profile=student and http://localhost:3000/dev-demo?profile=researcher. No password or Supabase setup is needed for demo workspaces. Each profile has its own browser-only storage and sample reading. Switch or exit demos in Settings. Demo access only works on localhost/loopback in development; it is disabled in production. AI features still need a configured provider and use real tokens.

Copy `.env.example` to `.env.local` and configure Supabase authentication plus AI. Sign-in is required before opening the workspace. Keep server keys private. See [current product and setup](docs/CURRENT_PRODUCT.md).

## Current workflows

- **Home:** your own projects, files, references, and next actions.
- **Explore:** a live news/disaster map fetching BBC World, UN News, GDACS, and USGS reports every five minutes. Published World Bank statistics remain in a separate view with observation years and comparisons.
- **Search:** approved institutions, research publishers, and established news organizations; save references to Library.
- **Library:** uploaded originals, extracted text, references, folders, favorites, APA export, and links to projects and practice.
- **Projects:** project sources, reading notes, typed/handwritten notebooks, separate policy briefs, evidence links, and citations. Unfiled notes and briefs remain available.
- **Practice:** material-based study conversations, recitation, diplomacy/MUN roleplay, scenario building, reviewers, quizzes, and flashcards, with neural read-aloud.

Settings includes appearance, voice preferences, JSON backup export/restore, and account synchronization. Original files are stored separately from JSON backups.

## Documentation

- [Search sources and access](docs/SEARCH_SOURCES.md) describes the approved directory, free-source defaults, open-access metadata and live catalog/feed coverage.

- [Complete Supabase SQL](schema.sql) creates the current workspace, private file/photo buckets, and account-specific policies. Run the whole file in Supabase SQL Editor; [verify RLS](supabase/verify-rls.sql) afterward.

- [Deploy the AI Edge Function](docs/EDGE_AI_SETUP.md) connects hosted AI to provider secrets in Supabase.

- [Supabase schema and email setup](docs/SUPABASE_SETUP.md) explains the active SQL and branded authentication email templates.

- [Current product, setup, and limits](docs/CURRENT_PRODUCT.md) is the current implementation reference.
- [Implementation history](docs/IMPLEMENTATION.md) records prior iterations and validation.
- [Design references](docs/design.md) contain the original visual direction.
- The numbered planning documents in [docs](docs/) are historical proposals; the current product document supersedes their older navigation, commercial plans, and preview features.

## Validation

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Live API tests use `ATLAS_TEST_URL`; cloud isolation tests require a configured disposable Supabase test environment.

Browser checks live in `tests/browser`; run the main check with `npm.cmd run test:browser` or the accessibility audit with `npm.cmd run test:ux` against a running app. `scripts/setup-pdf-worker.mjs` is required by installation for PDF imports. `scripts/create-user-manual.mjs` rebuilds the illustrated manual with `npm.cmd run manual:pdf`; the finished PDF is in `output/pdf`. Original reference images are in `docs/design-reference-images`.

Workspace APIs require a verified sign-in. Anonymous requests are rejected. For authenticated endpoint/browser integration checks, provide ATLAS_TEST_AUTH_COOKIE from a disposable test account along with ATLAS_TEST_URL; no guest bypass is built into the app.

Privacy and account deletion setup: see [docs/PRIVACY_AND_DELETION.md](docs/PRIVACY_AND_DELETION.md). Apply schema.sql or migration 005 before deploying the new cleanup, legal receipt and deletion flows. Account deletion additionally requires the server-only SUPABASE_SERVICE_ROLE_KEY. Public legal pages identify NEXT Technology (Philippines), with nextech11579@gmail.com as the contact; the operator must confirm actual retention/processor arrangements before launch.

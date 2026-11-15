# ATLAS

A personal International Studies workspace. No subscriptions, billing, or paid feature gates.

## Run locally

Use Node.js 22.18 or later.

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. For a production build, run `npm.cmd run build` and `npm.cmd start`.

Copy `.env.example` to `.env.local` to configure AI and optional cloud sync. Keep server keys private. See [current product and setup](docs/CURRENT_PRODUCT.md).

## Current workflows

- **Home:** your own projects, files, references, and next actions.
- **Explore:** a live news/disaster map fetching BBC World, UN News, GDACS, and USGS reports every five minutes. Published World Bank statistics remain in a separate view with observation years and comparisons.
- **Search:** approved institutions, research publishers, and established news organizations; save references to Library.
- **Library:** uploaded originals, extracted text, references, folders, favorites, APA export, and links to projects and practice.
- **Projects:** project sources, reading notes, typed/handwritten notebooks, separate policy briefs, evidence links, and citations. Unfiled notes and briefs remain available.
- **Practice:** material-based study conversations, recitation, diplomacy/MUN roleplay, scenario building, reviewers, quizzes, and flashcards, with neural read-aloud.

Settings includes appearance, voice preferences, JSON backup export/restore, and optional account synchronization. Original files are stored separately from JSON backups.

## Documentation

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

# Search and Library handoff — completed

The deferred task was resumed at the user's request and implemented.

- Inspected Psykie's Mistral query planning, Conversations web_search citations, approved-domain filtering, relevance notes and independent reference saving.
- Adapted that flow to ATLAS with Mistral-only AI and ATLAS' source list.
- Added a unified Library for uploaded material and saved references, independent of projects.
- Preserved existing project notes/associations and migrated legacy data without changing source/material IDs.
- Retained originals privately on-device, added download/relink, and supplied optional private Supabase file storage migration.
- Added duplicate handling, reference favorites/collections, APA copy/export, and Library-to-study/quiz launch.

See IMPLEMENTATION.md for setup, scope, limitations and validation. Live Mistral search, configured cloud storage/RLS and browser visual acceptance checks still require their respective environment configuration. No automatic reminder or scheduled task exists.

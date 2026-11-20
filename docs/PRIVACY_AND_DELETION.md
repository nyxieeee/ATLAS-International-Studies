# Privacy, persistence and account deletion

ATLAS is operated by NEXT Technology, Philippines. Privacy/support contact: nextech11579@gmail.com. Legal document version: 2026-11-20.

## Apply the database changes

For a new deployment, run the complete `schema.sql` in the Supabase SQL Editor. For an existing deployment with migrations 001–004 applied, run `migrations/005_privacy_and_deletion.sql`. Both are rerunnable and retain existing account content. The migration adds restrictive ownership guards, an account-erasure lock, immutable legal-agreement receipts, and a durable original-file deletion queue. It does not delete Supabase Storage metadata rows directly: files must be removed through the Storage API.

The server needs `SUPABASE_SERVICE_ROLE_KEY` alongside the public project URL. Put that key only in server environment configuration, never in `NEXT_PUBLIC_*`, the browser, version control, or logs. The account-deletion endpoint fails closed when this configuration is absent. Keep the deployed app and SQL in sync; missing queue/receipt tables produce actionable errors rather than pretend success.

After installation run `supabase/verify-rls.sql` and the live disposable-account tests described in README. Local PostgreSQL tests verify the supplied SQL; they cannot verify a hosted project's installed policies or existing data.

## What synchronization means

The workspace is an account-owned JSON database row containing notes, folders, projects, file metadata/extracted text, references, conversations, practice, progress and preferences. An edit, rename, trash action or permanent deletion changes that JSON and advances its optimistic concurrency revision. Edits save locally first, then sync after a short debounce. Later edits arriving during an upload are sent again after that upload finishes. Offline work remains dirty until confirmed; do not describe unsynced work as saved to the server.

Clean copies refresh from the database every ten seconds and on returning to the tab. Remote changes do not overwrite unsent local edits. A revision conflict pauses synchronization until the user chooses a version. A clean local cache does not recreate a database row removed remotely.

A note in Trash or an archived project is still retained data. Permanently deleting the item removes it from the next snapshot. A reference copied to a project or an excerpt copied to generated content is an independent copy; removing the original entry does not silently rewrite those copies.

Removing a material or replacing its original queues the old content-addressed file when no remaining material references it. On successful sync, initial load and retry, the app drains the owner's queue through the private Storage API and removes the device original. Failed cleanup leaves the queue pending for retry. A restrictive Storage deletion policy protects reattached files. Cleanup runs while the application is open and connected, so an offline/closed application can delay physical file deletion. For a guaranteed service-level cleanup deadline, operate a scheduled server worker over this queue and monitor failures. Legacy orphan files from removals made before this migration are not automatically purged; account deletion includes them.

## Account deletion

Settings links to `/account/delete`, which is separate from the workspace to avoid autosave recreating content during erasure. The user types DELETE; the server verifies the real signed-in user and same-origin request. Client-selected user IDs and development demo accounts are rejected.

The server first creates an erasure lock. Database and Storage policies deny further owner access and uploads. It then drains both ATLAS private file buckets through the Storage API and hard-deletes the verified Supabase Auth user. Foreign keys cascade the workspace, cleanup requests, agreement receipts and lock. Errors never report completion: the lock remains and the dedicated deletion page supports retrying. Monitor unresolved locks and provide support for abnormal/nested storage paths. Do not remove a lock without reviewing the partial deletion state.

After server success the browser clears that account's local workspace, original files and OCR cache, then signs out locally. Offline device copies, downloaded exports, legally required records and provider backups are not remotely erased. Other browsers holding a stale session cannot recreate database or Storage data for a deleted account because the SQL checks the live Auth user. Review all additional tables/buckets if the product grows; only active ATLAS resources are handled here.

## Legal pages and operating requirements

Public routes: `/terms`, `/eula`, `/privacy`, `/acceptable-use`, `/data-rights`. Signup has an affirmative agreement checkbox; signed-in users are shown versioned policies and can record acceptance through an owner-scoped RPC with a server timestamp. Acceptance receipts are immutable and deleted with the account. Terms agreement and privacy-notice acknowledgement are not blanket consent to unrelated processing or marketing.

Before public launch, NEXT Technology must confirm its exact legal identity and contact ownership, actual lawful bases, eligible audience/age practices, processor contracts and data locations, AI provider retention/training settings, hosting/log and backup retention schedules, incident response and required breach notification procedures, handling of data-subject requests, and any applicable NPC registration/DPO obligations. Publish an operational retention schedule once determined. Document and test these practices; legal pages and RLS alone do not establish compliance. Obtain qualified Philippine legal/privacy review, and review obligations for any other jurisdictions actually served. No arbitrary retention deadline or claim of universal GDPR compliance is made by the app.

Reference authorities: Philippine Data Privacy Act and IRR at https://privacy.gov.ph/Data-Privacy-Act/ and https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/; data-subject rights at https://privacy.gov.ph/data-subject-rights/; Supabase user deletion at https://supabase.com/docs/guides/auth/managing-user-data and Storage deletion at https://supabase.com/docs/guides/storage/management/delete-objects.

# Connect ATLAS to Supabase

## Database and private files

Run the complete root `schema.sql` in your Supabase project's SQL editor. This is the active schema, equivalent to `migrations/001_cloud_workspaces.sql` followed by `002_library_files.sql` and `003_profile_avatars.sql`. Choose either the combined file or the incremental files; both are safe to rerun and retain existing workspace rows and original files.

The former schema was a proposal for normalized research/content tables. Those tables are not used by the current app. The replacement does not drop them if they were previously installed.

The active integration uses:

| Object | Purpose |
| --- | --- |
| `auth.users` | Supabase-managed accounts; email and Google authentication |
| `public.atlas_workspaces` | One private JSONB workspace per account, containing projects, folders, notes, saved references, conversations and practice |
| `atlas-library-files` bucket | Private original files, at most 10 MB, stored at `<user UUID>/<file hash>` |
| `atlas-avatars` bucket | Private custom profile photos, at most 1 MB after resizing, stored under the user UUID |

Workspace snapshots have a 4,000,000-byte JSON limit. Updates must increment `revision` by one, and the app also filters by the prior revision to detect conflicts. Timestamps are server-controlled. RLS protects account ownership; restrictive guards prevent older broad policies from exposing ATLAS records or files. Stored originals cannot be overwritten: changed files get a new content hash.

Storage API permissions are provided by Supabase. The migration changes policies only for the ATLAS bucket and does not grant anonymous file access or make the bucket public. Authentication metadata already stores the signup display name; no separate profiles table or signup trigger is required by the app.

## App environment and authentication

Set these public browser configuration variables in `.env.local` and in your deployment environment, then restart/rebuild:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLIC-PUBLISHABLE-KEY
```

Use the public publishable key, never a service-role or secret key. AI provider keys belong in Supabase Edge Function secrets. Deploy the authenticated function following [EDGE_AI_SETUP.md](EDGE_AI_SETUP.md); secrets alone do not create the AI endpoint.

Follow [AUTH_SETUP.md](AUTH_SETUP.md) for Site URL, callback allowlists, Google OAuth, email confirmation and password recovery. Set Site URL to your ATLAS origin without a trailing slash. Confirm that `/brand/email-mark.png` loads on that origin after deployment; email clients need the deployed absolute image URL.

## Install the email HTML

Open `supabase/email-templates/preview.html` locally to review all eight templates at desktop and mobile widths. Sample addresses and inactive links in the preview are not used by the actual templates.

In Supabase **Authentication → Email Templates**, choose the matching template, paste the corresponding HTML body, and set its subject from `supabase/email-templates/subjects.json`:

| Supabase template | HTML file | Subject |
| --- | --- | --- |
| Confirm sign up | `confirm-signup.html` | Confirm your ATLAS account |
| Reset password | `reset-password.html` | Reset your ATLAS password |
| Magic link | `magic-link.html` | Your secure ATLAS sign-in link |
| Invite user | `invite-user.html` | You are invited to ATLAS |
| Change email address | `change-email.html` | Confirm your new ATLAS email address |
| Reauthentication | `reauthentication.html` | Your ATLAS verification code |
| Password changed notification | `password-changed.html` | Your ATLAS password was changed |
| Email address changed notification | `email-changed.html` | Your ATLAS email address was changed |

All action links use `{{ .ConfirmationURL }}`. Keep that variable unchanged: Supabase generates the verification URL and includes the requested redirect. `{{ .SiteURL }}` is used only for the logo. The recovery request already supplies `/auth/callback?intent=recovery`, which verifies the session before opening `/reset-password`. Do not replace the verification link with a direct link to the reset page.

The app currently exposes signup, email/password login, Google login and password reset. Templates for magic links, invitations, email changes and reauthentication are prepared for those Supabase flows; installing a template does not add the corresponding UI. If using admin invitations to let a user choose a password, set the invitation's redirect to your origin's `/auth/callback?intent=recovery` and allow it in Supabase. Security notification emails must be enabled in the project settings to be sent.

Configure a sender and SMTP delivery in Supabase. This task creates the templates; it does not change hosted settings or send emails. The templates use inline styles, table layouts, system fonts and a PNG logo. Browser previews are checked; test actual Gmail/Outlook delivery before launch.

## Verification

`npm.cmd test` includes an embedded PostgreSQL test of the unmodified schema: fresh installation, reruns, owner access, cross-account/anonymous denial, stale writes, invalid snapshots, private file policies and legacy-policy isolation. Supabase-managed Auth/Storage objects are represented by a local test harness; this is not a hosted end-to-end test.

The existing live tests in `tests/cloud-rls.test.mjs` and `tests/cloud-files-rls.test.mjs` use disposable test accounts and remain skipped until their documented `ATLAS_RLS_TEST_*` variables are supplied. Test signup confirmation, Google login, recovery and actual email delivery after connecting your project. No SQL or templates have been applied to a hosted project by this task.

References: [Supabase email variables](https://supabase.com/docs/guides/auth/auth-email-templates), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

After installation, run supabase/verify-rls.sql for read-only checks of both RLS flags, the owner-specific policies, and the private bucket. schema.sql explicitly enables workspace RLS and stops if Supabase-managed storage.objects does not already have RLS enabled; it does not silently assume Storage is protected.


## Profile photos

The header displays a custom account photo first, otherwise the Google/Auth profile picture, then account initials. Signed-out users keep the account icon. In Settings, signed-in users can choose JPG/PNG/WebP files up to 5 MB; the browser crops/resizes them to a 256-pixel JPEG before upload. Only the object path is stored in Auth metadata, not image data or a long-lived public URL. Private image URLs expire after an hour and refresh while the app is open. Reset restores the account photo or initials.

For an existing installation, run `migrations/003_profile_avatars.sql` (or rerun the combined schema) before uploading a custom photo. Google photos do not need the avatar bucket. Avatar RLS is tested alongside workspace/file isolation; hosted upload and Google identity checks still require your connected project.

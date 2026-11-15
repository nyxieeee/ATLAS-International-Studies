# ATLAS account setup

ATLAS requires a verified Supabase account before opening the workspace. The browser uses @supabase/ssr cookie sessions, and the server verifies the user with Auth. Existing device-only work is preserved and can be imported after signing in.

## Routes

- `/login`: email/password and Google sign-in.
- `/signup`: name, email and password; confirmation-email screen when required.
- `/forgot-password`: request a recovery email.
- `/auth/callback`: SDK PKCE session initialization, verified user check and safe internal redirect. Recovery links continue to `/reset-password`.
- `/reset-password`: valid signed-in recovery session required to update the password; password confirmation and success state.
- `/check-email`: confirmation/recovery guidance without exposing email or tokens in the URL.
- `/auth/error`: expired, cancelled or invalid link guidance.
- Unmatched URL paths render the custom ATLAS 404 with workspace and sign-in links.

Settings links to these screens instead of maintaining a second inline login form. The workspace is protected by a server redirect and a client session guard. Signing out unmounts the workspace and returns to login.

## Connect your Supabase project

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Use the public publishable key, never a service-role key. Restart development or rebuild production after public environment changes.
2. Run the root `schema.sql` for the active workspace/storage schema and RLS policies; see [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Existing cloud tests require separate test-account configuration; do not treat a successful sign-in as proof that RLS or storage policies are correct.
3. Under Supabase Authentication URL Configuration, set Site URL to the production ATLAS origin. Add exact redirect destinations for each origin you use:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?intent=recovery`
   - `https://YOUR-ATLAS-DOMAIN/auth/callback`
   - `https://YOUR-ATLAS-DOMAIN/auth/callback?intent=recovery`
   - The sign-in callback can include `?next=%2F%23settings` when entered from Settings; allow that exact URL too, or an appropriately scoped `/auth/callback**` pattern for your own origin. Avoid broad production origin wildcards.
4. Enable email/password authentication and decide whether signup requires confirmation. Configure email delivery/SMTP and the confirmation/recovery templates. Default verification links should continue to honor the requested redirect destination; do not hardcode all email links to the workspace root.
5. Enable the Google provider in Supabase and add its Google client ID/secret there. In Google Cloud, configure the OAuth consent screen and the authorized redirect URI supplied by Supabase, normally `https://YOUR-PROJECT.supabase.co/auth/v1/callback`. That URI is different from ATLAS's `/auth/callback`.
6. Open `/login` and test both email and Google flows. With an unconfigured project the pages explicitly disable sign-in; they do not pretend an account was created.

The browser client uses PKCE with URL session detection. Supabase handles the code exchange during initialization; the custom callback does not exchange the same code twice. Open email links in the browser that initiated signup/recovery so the code verifier is available. Old links generated before this change may need to be requested again. Callback query/fragment errors are not echoed as raw HTML; callback parameters are removed before returning to the workspace.

## Required live checks before launch

- New signup, email confirmation and duplicate-account behavior.
- Valid/invalid email login and Google login, including cancellation and provider-disabled errors.
- Recovery email, expired/reused links, password confirmation, successful update and login with the new password.
- Account A/B workspace and original-file isolation, guest import, sign-out and multi-device conflict behavior.
- Production domain redirect allowlist and email delivery.

Authentication does not resolve the separately observed search quota limits, publisher HTTP 403 responses or neural speech stream failures. Every app API handler requires a server-verified account, including AI, OCR, search, maps, citations, practice and speech. API responses are private/no-store, and refreshed cookies are carried to the browser. The app is not declared production complete merely by adding login screens.

## Motion

Shared page entry is 480 ms, panels/menus 380 ms, closing 260 ms and small interactions 220 ms. Closing components read the same CSS duration instead of disappearing on an older shorter timer. Auth entry uses a restrained 650 ms animation. Map pointer updates remain frame-based and immediate. Reduced-motion preferences disable these decorative transitions.

## References

- [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Google OAuth sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)
- [Password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)

Validation uses mocked SDK operations for redirect, signup, password and error handling, plus real browser layout/accessibility tests. Real provider/account delivery and isolation checks remain pending until Supabase and Google are configured.

## Branded email templates

Ready-to-paste Supabase emails are in `supabase/email-templates/`, with subject mappings in `subjects.json` and a local `preview.html`. Setup and supported flows are documented in [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Action links retain Supabase’s `{{ .ConfirmationURL }}` placeholder.

## Required-login deployment

Deploy the updated code and keep NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY configured in the hosting environment. There is no guest bypass, including when configuration is missing. Login, signup, Google callback, recovery and email-logo assets remain public. Previous localStorage-only sessions may require one new sign-in after the cookie-session migration; account workspace data and earlier device backups are not deleted.

API business integration tests and workspace browser audits now require ATLAS_TEST_AUTH_COOKIE from a disposable signed-in test account. Do not use a personal account for seeded audits. Browser test helpers intercept workspace/file writes for isolated UI fixtures. Boundary tests always verify that anonymous access is rejected.

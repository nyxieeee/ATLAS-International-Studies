# Deploy ATLAS AI to Supabase

Saving secrets does not create an API. Deploy the `atlas-ai` Edge Function as well as the updated ATLAS app. No database changes are required for this step.

## Supabase dashboard

1. Open your ATLAS project, then **Edge Functions** and create a function using the editor.
2. Name it **atlas-ai**. Replace the example code with the complete contents of [index.ts](../supabase/functions/atlas-ai/index.ts), then deploy it.
3. In the function settings, turn off **Verify JWT with legacy secret**. The function independently verifies every user's bearer token through Supabase Auth before using either provider. This supports projects using newer signing keys; disabling the legacy gateway check does not disable account verification in this function.
4. Under Edge Function secrets, keep `MISTRAL_API_KEY` and `GROQ_API_KEY`. Supabase supplies `SUPABASE_URL` automatically. Never put provider keys in browser environment variables.
5. Redeploy ATLAS from the latest GitHub commit. Its hosting environment needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for this same project. The function name defaults to `atlas-ai`; `ATLAS_AI_EDGE_FUNCTION` only needs setting if you chose another name.
6. Sign in to ATLAS and send a short AI Chat message. Then test image text extraction. Inspect **atlas-ai → Logs** if either fails; the dashboard's unauthenticated test request is deliberately rejected.

The app host does not need Groq or Gemini keys. Leave `ATLAS_AI_BACKEND` unset for automatic Edge routing, or set it to `edge` to require this backend explicitly.

## CLI alternative

From this repository with the Supabase CLI installed and authenticated:

```powershell
supabase functions deploy atlas-ai --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

The function uses Ministral 8B (`ministral-8b-latest`) for text tasks, GPT-OSS 120B with browser search for grounded discovery, and Ministral 8B for image transcription. Provider account limits still apply. It validates registered accounts, pins models and tools, limits input sizes, and returns sanitized failures. Search citations continue to be validated by the ATLAS server.

If ATLAS says AI setup is incomplete, check that the function exists in the same project as the app's public URL. If sign-in cannot be verified, check the legacy JWT setting and sign in again. Provider errors require checking the secrets and provider account in the Supabase dashboard. Never paste keys or access tokens into screenshots or support messages.

## Updating an existing Mistral OCR deployment

1. Add `MISTRAL_API_KEY` in this same project under Edge Function secrets. Keep the key private; do not paste it into chat. `MISTRAL_API_KEY` serves text and OCR; `GROQ_API_KEY` serves search.
2. Replace the deployed `atlas-ai` code with the latest complete [index.ts](../supabase/functions/atlas-ai/index.ts), then deploy. Keep the legacy gateway JWT setting as described above; the handler still verifies accounts.
3. Deploy the latest ATLAS app commit and retry extraction with a clear PNG/JPEG/WebP image containing known text. Inspect function logs if it fails.

The Gemini secret is no longer read by ATLAS. No SQL or database migration is needed. Changing only Vercel does not update the Supabase function.

Image transcription uses Ministral chat completions with embedded image bytes. Images up to 4 MB bypass canvas conversion in the app.

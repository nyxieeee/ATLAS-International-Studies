# ATLAS AI setup

Hosted ATLAS routes AI through the authenticated Supabase `atlas-ai` Edge Function. Store `GROQ_API_KEY` and `MISTRAL_API_KEY` in Supabase secrets, then follow [EDGE_AI_SETUP.md](EDGE_AI_SETUP.md) to deploy the function. Saving secrets alone does not deploy it. The app host needs the public Supabase URL and publishable key, not provider keys.

For local direct-provider development only, set `ATLAS_AI_BACKEND=direct` and the two provider keys in `.env.local`. Keep all keys private and out of source control.

Text tasks use Groq's `qwen/qwen3.8-27b`: chat, summaries, reviewers, quiz and flashcard generation, practice conversations, source relevance review and interpretation of retrieved relationship passages. Structured tasks request JSON and retain ATLAS's existing source and answer validation.

Image transcription uses Mistral's `ministral-8b-latest`, following Psykie's image-in-chat approach. PNG, JPEG and WebP uploads go only to the OCR provider. Extracted text can then be used by the text AI. Neither provider silently substitutes for the other if a key or service fails.

Search combines Groq browser search with actual records from approved direct catalogs and feeds. GPT-OSS 120B also uses Groq browser search for grounded discovery. Only executed-tool source records matching approved publishers are accepted; generated answer links cannot create records. Microsoft neural speech remains independent of these AI providers.

`GET /api/ai` exposes `configured` for text and `ocrConfigured` for image transcription, without exposing keys. Each provider has its own account access, rate limits and quotas; a 429 can indicate throttling or exhausted quota.

Checks include provider routing, image isolation, JSON generation, protected quiz answers, source evidence validation and sanitized provider failures. Live credentials must also be tested in the deployment environment.

## Readable official evidence

Relationship research prioritizes official GOV.UK Search/Content API articles and World Bank plain-text editions when supplied by its document catalog. Original public article links, publisher dates and exact retrieved passages remain attached to assessments. Generic browser challenge pages are rejected even when they return HTTP 200. Source statements express their issuing governments’ positions; they are not independent worldwide diplomatic ratings. Catalog coverage remains incomplete.

Groq browser search uses the existing GROQ_API_KEY and has provider-specific tool charges and quotas. It runs separately from structured text requests because browser search does not support structured outputs. Approved browser-open excerpts can support exact-quote relationship analysis when publisher HTML is blocked, and are labeled as excerpts. No publication date is inferred from model prose. If browser search fails, the UI labels direct-source fallback coverage.

Groq requests automatically retry up to twice only for explicitly identified short per-minute throttles (15 seconds or less), honoring Retry-After and cancellation. Daily/account limits and unclassified errors are not blindly retried. Relationship assessment failures are tracked separately from search failures, and short throttle failures are not held in the two-minute empty-result cache. A live Philippines-China run recovered from 11-second and 2-second TPM delays and returned supported evidence.

## Qwen text and assessment routing

Text tasks and structured evidence assessment now use qwen/qwen3.8-27b in non-thinking mode. Grounded browser discovery stays on openai/gpt-oss-120b because Groq rejected the browser_search tool for Qwen (HTTP 400). The account currently exposes an 8,000 TPM limit for Qwen as well; this split reduces back-to-back work on the search model rather than promising higher free quotas. OCR remains on Ministral. Existing saved content retains its original model metadata.

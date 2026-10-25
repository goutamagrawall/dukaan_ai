# Dukaan AI

A multilingual voice-first business assistant for Indian shopkeepers.

Live frontend: https://dukaan-ai-shopkeeper.geethanshr.chatgpt.site

## Features

- Sarvam Saaras v3 speech recognition and Sarvam-105B structured understanding.
- Hindi, Hinglish, English and other supported Indian languages; up to 28 seconds per recording.
- Editable confirmation for sales, purchases, expenses, credit and collections.
- Itemized calculations in integer paise; cash, UPI, partial payments and udhaar.
- Customer ledgers, transaction edits, receipts, PDF printing, text downloads, sharing and CSV exports.
- Daily dashboard, sales charts, cost-aware profit estimates and voice/text business questions.
- Clearly labeled sample workspace and fresh-start onboarding.
- Responsive layouts, keyboard navigation, dialog focus trapping and reduced motion.

## Architecture

Browser → ChatGPT Sites frontend → authenticated Sites proxy → Supabase Edge Function → Postgres / Sarvam.

Backend project: `sarvam-ai-backend` (Mumbai / ap-south-1).

Sites supplies authenticated user identity. Its server forwards that identity with a private service token. The Edge Function verifies the token before each operation. It uses the platform-provided Supabase service role internally. Both business tables have row-level security enabled, with direct access revoked for anonymous and authenticated API roles. Mutations scope every operation by owner and use per-owner Postgres advisory locks to prevent concurrent overcollection.

The Sarvam key and service token are encrypted in Supabase Vault. Only a service-role-only function can read them. Neither is returned to the browser or committed to Git. The Edge Function authenticates service calls itself; platform JWT verification is disabled for this endpoint.

## Local development

Node >=22.13 required; Node 24 recommended.

```sh
npm ci
cp .env.example .dev.vars
# Add your backend URL and private service token locally.
npm run dev
```

The local Sites mock sign-in isolates development under the `local_seedy` owner. Hosted users use ChatGPT Sites sign-in. Do not put secrets in frontend environment variables.

## Supabase deployment

1. Apply `supabase/migrations/202610250001_dukaan.sql` to a new project.
2. In Supabase Vault, create `dukaan_sarvam_api_key` and a random `dukaan_backend_token`.
3. Deploy `supabase/functions/dukaan-api` with `verify_jwt=false`. The function does its own token verification.
4. Configure `DUKAAN_BACKEND_URL` and secret `DUKAAN_BACKEND_TOKEN` in the Sites runtime environment and redeploy.

The Edge Function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, supplied by Supabase. Keep `supabase/functions/dukaan-api/business.ts` identical to `lib/business.ts` when changing calculation rules.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run test:api
```

API tests call the deployed backend using a new dedicated `qa:dukaan-smoke:<uuid>` workspace on every run. They never modify a real shop. They validate Hindi/Hinglish understanding, server calculations, persistence, partial credit, collections, idempotency, concurrency and protected deletion, and then remove their own test transactions. Sarvam API calls consume a small amount of API usage.

## Accounting scope

Credit sales count as revenue when recorded. Collections reduce debt and never count as another sale. Estimated profit uses known sale-item costs minus operating expenses; missing costs are excluded and coverage is shown. Inventory purchases are tracked separately. This MVP does not include GST invoices, returns, supplier credit, automatic inventory reconciliation, payment processing or offline synchronization.

Dates use Asia/Kolkata. Submitted text/audio is processed by Sarvam; the app does not retain raw audio. Chat history lasts only in the current page session. Confirmed records persist in Supabase.

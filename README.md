# Dukaan AI

A multilingual voice-first business assistant for Indian shopkeepers.

- GitHub Pages: https://goutamagrawall.github.io/dukaan_ai/
- ChatGPT Sites: https://dukaan-ai-shopkeeper.geethanshr.chatgpt.site

Both frontends open without login. Each browser gets its own private workspace. Data is stored in Supabase; an opaque workspace credential stays in that browser. The two website origins use separate workspaces. Clearing browser storage or switching devices removes access to the old workspace, so export records regularly. This MVP has no account recovery or cross-device synchronization.

## Features

- Sarvam Saaras v3 speech recognition and Sarvam-105B structured understanding.
- Browser recordings are decoded, downmixed and resampled to mono 16 kHz WAV before upload; audio-file upload is available if microphone permissions are unavailable.
- Hindi, Hinglish, English and other supported Indian languages; up to 28 seconds per recording.
- Editable confirmation for sales, purchases, expenses, credit and collections.
- Automatic quantity × unit-price calculations in integer paise.
- Cash, UPI, partial payments, customer udhaar and debt collections.
- Itemized receipts: print / save as PDF, text downloads, sharing and CSV exports.
- Daily dashboard, sales charts, cost-aware profit estimates and voice/text business questions.
- Clearly labeled sample workspace and fresh-start onboarding.
- Mobile layouts, keyboard navigation, dialog focus trapping and reduced motion.

## Architecture

Browser → Supabase `dukaan-api` Edge Function → Postgres / Sarvam.

The same React interface builds for GitHub Pages as static HTML, CSS and JavaScript, and for ChatGPT Sites using Vinext. GitHub Pages has no server-side API. All sensitive operations run in Supabase.

The browser receives a cryptographically random 256-bit workspace credential, stores it locally, and sends it only to the backend over HTTPS. Supabase stores only its SHA-256 hash and derives the record owner from that verified credential. Clients cannot choose or change their owner. New sessions, AI calls and writes have server-side usage limits. CORS restricts browser requests to the two published origins and local previews.

Business and session tables have row-level security enabled, with direct access revoked for anonymous and authenticated API roles. The service-only mutation function scopes operations by owner and uses per-owner advisory locks to prevent concurrent overcollection. The Sarvam API key and trusted server connection token are encrypted in Supabase Vault. Neither secret appears in frontend assets or Git.

The original authenticated Sites proxy remains available to trusted server clients; public browsers use their private workspace credential instead.

## Run locally

Node >=22.13 required; Node 24 recommended.

```sh
npm ci
npm run dev:pages
```

Open the printed URL ending in `/dukaan_ai/`. No secrets are required for frontend development against the configured backend. Microphone recording works on HTTPS or localhost after the user grants microphone permission.

## Build / deploy

```sh
npm run build:pages
```

This writes the static frontend to `docs/`. GitHub Pages serves `main` → `/docs`; push a fresh build to update the public link. `vite.pages.config.ts` configures the repository base path.

```sh
npm run build
```

This builds the ChatGPT Sites version. Its public access setting is managed in Sites, separately from source deployment.

For a new Supabase project:

1. Apply the checked-in migrations in `supabase/migrations/` in order.
2. In Vault, create `dukaan_sarvam_api_key` and a random `dukaan_backend_token`.
3. Deploy `supabase/functions/dukaan-api` with `verify_jwt=false`; it validates browser and service credentials itself.
4. Update the public backend URL in `lib/client-api.ts` and the origin allowlist in `browser-auth.ts`.

The function uses the platform-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Keep `supabase/functions/dukaan-api/business.ts` identical to `lib/business.ts` when changing calculation rules.

## Validation

```sh
npm run typecheck
npm test
node scripts/public-smoke-test.mjs
```

The public smoke test creates fresh isolated browser sessions, verifies token validation and cross-workspace privacy, creates then removes its own QA transaction, and does not touch an existing shop. `--voice` additionally generates and transcribes a short Hindi fixture; it needs a temporary `SARVAM_TEST_API_KEY` environment variable. AI calls use Sarvam credits.

The trusted service tests (`npm run test:api`) require an ignored `.dev.vars` configuration and use a separate `qa:` owner. They cover persistence, calculations, idempotency, partial credit, collections, concurrent overcollection and protected deletion.

## Accounting scope

Credit sales count as revenue when recorded. Collections reduce debt and never count as another sale. Estimated profit uses known sale-item costs minus operating expenses; unknown costs are excluded and coverage is shown. Inventory purchases are tracked separately. GST invoices, returns, supplier credit, automatic inventory reconciliation, payment processing and offline synchronization are outside this MVP.

Dates use Asia/Kolkata. Submitted text/audio is processed by Sarvam; this app does not retain raw audio. Conversation history lasts only in the current page session. Confirmed records persist in Supabase.


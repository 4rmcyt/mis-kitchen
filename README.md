# mis. — Kitchen App

PWA + Supabase + Cloudflare Pages.

## Quick start

```bash
bash scripts/bootstrap.sh
cp .env.example .env
# fill in .env with Supabase credentials
npm run dev
```

## Deploy

See the deployment checklist in DEPLOY.md.

## Structure

```
src/
  main.tsx              — React entry point
  App.jsx               — cook app tab routing (Today / Recipes / Lineup)
  Admin.tsx             — admin panel (People / Tasks / Recipes / Reports / Velocity / Wins / Schedule / Push)
  domain/               — pure business logic, no I/O (unit-tested)
  hooks/features/       — feature controllers (data fetching + state)
  screens/              — cook-facing screens
  admin/tabs/           — admin tab components
  lib/                  — Supabase client, query helpers, constants, types

supabase/
  migrations/           — applied via Supabase MCP; local stubs committed after each apply
  functions/
    send-report/        — end-of-shift email via Resend
    send-invite/        — invite email + link delivery
    accept-invite/      — invite onboarding (account creation)
    send-push/          — web push delivery
    push-sync/          — employee + schedule sync
    push-webhook/       — real-time Push Operations events

e2e/
  features/             — Cucumber .feature files
  steps/                — Playwright step definitions
  support/              — world.js, supabase_admin.js (test data helpers)

public/
  sw.js                 — service worker (offline support)
  manifest.json         — PWA manifest

terraform/
  main.tf               — Cloudflare Pages + DNS + WAF + Supabase IaC

.github/workflows/
  ci.yml                — main pipeline: deploy → E2E (staging only)
  deploy.yml            — check → build → migrate → edge functions → Cloudflare Pages
  e2e.yml               — full E2E suite (Playwright + Cucumber)
  e2e-invite.yml        — invite onboarding E2E
  preview.yml           — Cloudflare preview deploys for PRs
  terraform.yml         — IaC pipeline
```

## Secrets needed

| Secret | Where |
|--------|-------|
| `VITE_SUPABASE_URL` | `.env` + GitHub Var |
| `VITE_SUPABASE_ANON_KEY` | `.env` + GitHub Secret |
| `RESEND_API_KEY` | `supabase secrets set` |
| `FROM_EMAIL` | `supabase secrets set` |
| `CLOUDFLARE_API_TOKEN` | GitHub Secret |
| `SUPABASE_ACCESS_TOKEN` | GitHub Secret |

Full list in DEPLOY.md.

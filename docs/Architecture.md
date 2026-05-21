# Architecture

## Stack

| Layer              | Technology                                 |
| ------------------ | ------------------------------------------ |
| Frontend           | React 18 + Vite, SPA                       |
| Hosting            | Cloudflare Pages                           |
| Backend            | Supabase (PostgreSQL + PostgREST + GoTrue) |
| Edge Functions     | Supabase Edge Functions (Deno)             |
| Email              | Resend                                     |
| Push Notifications | Web Push API + FCM                         |
| PWA                | Service Worker, installable iOS/Android    |
| E2E Tests          | Cucumber.js + Playwright                   |
| CI/CD              | GitHub Actions                             |

## Environments

| Environment | URL | Supabase |
|---|---|---|
| Staging | staging.mis-kitchen-prod.pages.dev | cloud `nlvuqcvjlkgybvcpiqzn` |
| Production | mis.kitchen (planned) | self-hosted k3s [[Self-hosted Supabase]] |

## Key Files

```
src/
  App.jsx          — user app (Today, Recipes, Lineup)
  Admin.jsx        — admin panel (People, Tasks, Recipes, Reports)
  Join.jsx         — invite onboarding /join/:token
  lib/supabase.js  — all Supabase client calls

supabase/
  migrations/      — SQL migrations (stubs always committed after MCP apply)
  functions/
    send-invite/   — send invite email via Resend
    accept-invite/ — process /join/:token form submission
    send-report/   — daily report emails
    push-sync/     — push notification sync
    push-webhook/  — push delivery webhooks

e2e/
  features/        — Cucumber .feature files
  steps/           — Playwright step definitions
  support/         — world.js, login.js, supabase_admin.js, mailtrap.js

.github/workflows/
  deploy.yml       — lint → build → Cloudflare deploy → trigger E2E
  e2e.yml          — E2E Sanity (runs after deploy)
  e2e-invite.yml   — Invite flow E2E
  monitor.yml      — health check every 5min, alerts via Telegram + Resend email
```

## CI/CD Flow

```
git push staging
  → deploy.yml
    → pnpm lint
    → pnpm build
    → Cloudflare Pages deploy
    → supabase db push (migrations)
    → trigger e2e.yml + e2e-invite.yml
  → e2e.yml
    → cucumber-js (24 scenarios)
    → upload HTML report artifact
```

## Related

- [[Database]]
- [[Invite Flow]]
- [[E2E Testing]]
